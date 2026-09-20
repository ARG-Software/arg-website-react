---
seoTitle: Message Broker Guarantees and Idempotency
slug: stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee
tag: Reliability
tags: Reliability, Architecture, Backend
title: Stop Trusting Your Message Broker: Why Idempotency Is a Core Safety Net
subtitle: Ordering, delivery semantics, outbox/inbox patterns, and the real limits of idempotency in event-driven systems.
intro: Ordering, delivery semantics, outbox/inbox patterns, and the real limits of idempotency in event-driven systems.
date: April 21, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 8 min read
---
### A practical look at what actually keeps event-driven systems correct.

![Stop Trusting Your Message Broker: Why Idempotency Is a Core Safety Net](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee-header.webp)

If you have ever debugged why a customer got charged twice, or why an order shipped before payment was captured, the lesson is familiar: a broker guarantee is narrower than an end-to-end business guarantee. Ordering is one property teams chase. Idempotency is a core safety net, but it is not a substitute for durability, atomic publication, concurrency control, or workflow invariants.

## 🧩 The Ordering Fallacy

You publish events for an aggregate, expecting a logical, linear sequence:

OrderPlaced ➡️ PaymentCaptured ➡️ OrderShipped

Some brokers can preserve order within a defined scope: a Kafka partition, an SQS FIFO message group, or an Azure Service Bus session. That is not global order, and delivery order is not automatically completion order when handlers run concurrently.

The hard truth is that no broker setting makes every side effect correct across every failure mode. Choose the smallest ordering scope the domain needs, then enforce valid state transitions and versions in the system of record.

![Message broker idempotency workflow for duplicate event handling](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-2.webp)

The events can be published in order and still complete out of order. Techniques such as one in-flight handler per aggregate, partition keys, FIFO message groups, and Service Bus sessions can preserve scoped processing order. Retries, dead-letter replay, re-partitioning, and downstream concurrency still need explicit design.

> Ordering constrains sequence. Idempotency constrains duplicate effects. You often need both.

## 🔁 Idempotency as the Foundation

Idempotency means that applying the same logical operation more than once has the same intended durable effect as applying it once, within a defined scope and retention period.

Retries and redeliveries are normal with at-least-once delivery. Even with perfect per-key ordering, a consumer that commits its work but crashes before acknowledging the message can see it again. If the handler is not idempotent, the side effect can happen twice.

Broker-specific “exactly once” features are useful but scoped. Kafka can atomically commit consumed offsets and produced Kafka records when configured for transactions and read-committed consumption; an unrelated database or payment API is outside that transaction unless it cooperates. SQS FIFO deduplicates sends within its documented deduplication interval. Neither statement means an arbitrary business workflow executes exactly once.

> Idempotency controls duplicates. It does not recover a message that was never durably published, repair a stale event, or undo a partially completed external side effect.

## 🛠️ What to check when creating idempotent consumers

### 1. Natural idempotency 💡

Natural idempotency means designing an operation so repetition does not change its intended effect.

The simplest way to understand this is by comparing a light switch and a bell.

- The light switch (idempotent): setting a switch to “ON” repeatedly leaves it on.

Why it can be safe: if an order is still cancellable, setting its state to `CANCELLED` twice has one durable effect.

- The bell (non-idempotent): every press creates another sound.

Why it is risky: `SET retry_count = retry_count + 1` runs the effect on every delivery.

```csharp
// Repeat-safe only if CANCELLED is still a valid transition.
await db.ExecuteAsync(
    """
    UPDATE orders
    SET status = @status
    WHERE id = @id AND status IN ('PENDING', 'CANCELLED')
    """,
    new { id = orderId, status = "CANCELLED" });

// Not idempotent: every retry increments again.
await db.ExecuteAsync(
    "UPDATE orders SET retry_count = retry_count + 1 WHERE id = @id",
    new { id = orderId });
```

An unconditional `SET status = 'CANCELLED'` is mechanically idempotent but can still be wrong: a stale cancellation event must not overwrite an order that has already shipped. Business-state guards or aggregate versions are what make the operation semantically safe.

> To decide if your operation is naturally idempotent, ask yourself: “Does this describe a specific destination, or a step in a process?”

To transform a non-idempotent event into an idempotent one, you must move from relative instructions (which accumulate) to an absolute state (which defines an outcome).

Instead of sending a relative instruction, send a fact or target state with an aggregate version. The version prevents a duplicate or stale event from overwriting newer state.

### The event payload

- Instead of: { "action": "increment_retry" }
- Use: { "order_id": 123, "target_retry": 5, "expected_previous_version": 4 }

### The database logic

Your handler now performs a Conditional Update:

```sql
-- The database only executes this if the record is currently at version 4.
-- If the retry happens again, the version is already 5, so it does nothing.
UPDATE orders
SET retry_count = 5,
version = 5
WHERE id = 123
AND version = 4;
```

Why this works:

- First attempt: The database finds the record at version 4. It updates it to version 5. Success.
- Duplicate attempt: The database looks for the record at version 4. It isn't there anymore (it's at 5). The database changes 0 rows.

Zero affected rows does not automatically mean “duplicate.” It can also mean the aggregate is missing or a later version arrived first. Read the current version and distinguish stale/duplicate events from gaps that need retry, parking, or reconciliation.

### 2. The inbox pattern 📥

The general-purpose consumer approach is to claim a message ID in an inbox inside the same local database transaction as the domain write. Scope the unique key by consumer when multiple handlers legitimately process the same message.

![Idempotent message processing architecture for distributed systems](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-3.webp)

Inbox Pattern

```csharp
public async Task Handle(OrderPlaced msg, Guid messageId)
{
    await using var tx = await db.BeginTransactionAsync();

    var claimed = await db.ExecuteScalarAsync<int?>(
        """
        INSERT INTO inbox (consumer, message_id, processed_at)
        VALUES (@consumer, @messageId, NOW())
        ON CONFLICT (consumer, message_id) DO NOTHING
        RETURNING 1
        """,
        new { consumer = "orders", messageId },
        tx);

    if (claimed is null)
    {
        await tx.RollbackAsync();
        return;
    }

    await ordersRepo.Insert(msg.OrderId, msg.Amount, tx);
    await tx.CommitAsync();
}
```

Back this with a unique constraint on `(consumer, message_id)`. Claiming first avoids a check-then-insert race. If two deliveries overlap, the database resolves the conflict; only the transaction that owns the claim commits its domain changes. Acknowledge the broker message only after that commit.

This guarantee stops at the transaction boundary. Do not perform a non-transactional payment or email between the inbox claim and commit and assume rollback will undo it. Use the external provider's idempotency contract or stage the intent for a separate worker.

Define inbox retention from the maximum broker redelivery/replay horizon. Deleting deduplication records too early makes an old replay new again; retaining them forever has storage and privacy costs.

### 3. Version-based idempotency 🔢

Each event carries the aggregate version it was produced from. The handler only applies the event if the stored version matches the expected predecessor. One mechanism handles both duplicates and out-of-order delivery.

![Message broker reliability limits and idempotency guarantees](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-4.webp)

Version Based Idempotency

```csharp
public async Task Handle(OrderUpdated msg)
{
    var rows = await db.ExecuteAsync(
        """
        UPDATE orders
        SET status = @status, version = @newVersion
        WHERE id = @id AND version = @expectedVersion
        """,
        new
        {
            id = msg.OrderId,
            status = msg.Status,
            newVersion = msg.Version,
            expectedVersion = msg.Version - 1
        });

    if (rows == 0)
    {
        var current = await ordersRepo.GetVersion(msg.OrderId);

        if (current >= msg.Version) return; // duplicate or stale

        throw new OutOfOrderException(current, msg.Version); // gap: retry or park
    }
}
```

Versions solve more than duplicate detection, but not everything. A missing predecessor can retry forever, so define a bounded retry, parking/dead-letter, and reconciliation path. Concurrent handlers still need the conditional update or equivalent serialization; reading a version and updating later without a condition reintroduces a race.

### 4. The transactional outbox protects publication 📤

The inbox protects a consumer's local write. It does not solve the producer's dual write: committing business data and publishing an event are two separate operations.

Write the aggregate change and an outbox row in one database transaction. A relay publishes committed outbox rows and marks them sent later:

```csharp
await using var tx = await db.BeginTransactionAsync();

await ordersRepo.Update(order, tx);
await outboxRepo.Add(new OutboxMessage(
    messageId: Guid.NewGuid(),
    aggregateId: order.Id,
    aggregateVersion: order.Version,
    type: "OrderUpdated",
    payload: JsonSerializer.Serialize(orderEvent)), tx);

await tx.CommitAsync();
```

The outbox prevents “database committed, event never published” and “event published, database rolled back.” The relay can still publish twice if it crashes after broker acceptance but before marking the row sent. That is why an outbox normally pairs with idempotent consumers or an inbox. Preserve per-aggregate sequence metadata if publication order matters, and monitor stuck/poisoned outbox rows.

### 5. Idempotency keys for external calls 🌍

When you make an external call (like to Stripe, Twilio, or FedEx), you are essentially blindfolded:

- The Request Phase: You send data into the void.
- The Transit Phase: The network might drop, the external server might crash mid-process, or your own server might time out waiting for a response.
- The Response Phase: You receive an acknowledgment - or you don’t.

If you don’t receive an acknowledgment, you cannot know if the external system:

- Never received the request.
- Received it, processed it, but the response was lost in transit.
- Received it, but it is currently sitting in a queue waiting to be processed.

An idempotency key is a provider-specific contract. It moves duplicate detection for one logical API operation into the external system, subject to that provider's key scope, retention, parameter-matching, and error behavior.

Do not assume every API implements the same behavior. For example, Stripe stores the first result for an idempotency key, including a `500`, compares parameters on reuse, accepts keys on `POST` requests, and may prune keys after at least 24 hours. Read the contract before deciding a retry is safe.

- Request arrival: the external API receives a stable key for this payment operation.
- The “Key” Check: Before doing any work, it checks: “Have I seen this key before?”
- The Branching Path:

- If new: it processes the request and associates the result with the key according to its contract.
- If duplicate: it returns or rejects according to that contract instead of blindly performing the same operation again.

```csharp
var requestOptions = new RequestOptions
{
    IdempotencyKey = $"payment:{msg.PaymentOperationId}"
};

var payment = await paymentIntents.CreateAsync(
    new PaymentIntentCreateOptions
    {
        Amount = msg.AmountCents,
        Currency = "usd",
        PaymentMethod = msg.PaymentMethodId,
        Confirm = true
    },
    requestOptions);
```

The key identifies the logical payment attempt, not merely the order. The same order might later have a legitimate second payment, adjustment, or refund. Persist the key before the call so every retry uses the same value, and never put personal data in it.

This complements the inbox rather than replacing it. The local transaction protects your database; the provider's idempotency implementation protects the external operation within its documented scope.

## What idempotency does not guarantee

Idempotency is necessary in many systems, but “idempotent” is not the same as “correct”:

- It does not prevent message loss. Use durable publication, publisher confirms/acks as appropriate, and a transactional outbox or equivalent change-data-capture design.
- It does not impose order between different messages. Use partition/session keys, versions, and valid state-transition rules.
- It does not make two different messages mutually exclusive. Use database constraints, optimistic concurrency, or locks where the invariant requires them.
- It does not atomically cover an external side effect and your database. Use the provider's idempotency contract plus persisted intent, status reconciliation, and compensating workflows.
- It does not decide what to do with poison messages, permanent failures, or version gaps. Bound retries and provide dead-letter/parking and operator-visible reconciliation.
- It is rarely infinite. Inbox records, broker deduplication windows, and API idempotency keys all have scopes and retention limits.

## Closing Thought 💭

At the end of the day, retries, ambiguous acknowledgements, crashes, and replays are ordinary distributed-system behavior. Treat every message as a potential duplicate, but also design for messages that are late, missing, stale, or permanently unprocessable.

Make the guarantees explicit: outbox for publication, broker configuration for transport, scoped ordering where the domain requires it, inbox/version checks for consumption, provider idempotency for external effects, and reconciliation for everything no single transaction can cover. Boring and predictable beats magical “exactly once” every time.

## Sources

- [Apache Kafka: Message delivery semantics and transactions](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Amazon SQS: At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS: FIFO deduplication scope](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [RabbitMQ: Reliability and data safety](https://www.rabbitmq.com/docs/reliability)
- [Microsoft: Azure Service Bus sessions and ordered processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
