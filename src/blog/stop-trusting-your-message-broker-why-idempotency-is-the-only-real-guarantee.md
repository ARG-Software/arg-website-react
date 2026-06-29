---
seoTitle: Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee
slug: stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee
tag: DevOps
title: Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee
subtitle: Stop relying on message ordering for correctness. Learn why idempotency is the only real safety net against data loss and duplicate charges
intro: Stop relying on message ordering for correctness. Learn why idempotency is the only real safety net against data loss and duplicate charges
date: April 21, 2026
readTime: 8 min read
---
### A practical look at what actually keeps event-driven systems correct.

![Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee-header.webp)

If you have ever debugged why a customer got charged twice, or why an order shipped before payment was captured, the lesson is familiar: message brokers do not give you the guarantees you think they do. Ordering is the symptom most teams chase. Idempotency is the property that actually saves the system.

## 🧩 The Ordering Fallacy

You publish events for an aggregate, expecting a logical, linear sequence:

OrderPlaced ➡️ PaymentCaptured ➡️ OrderShipped

However, in a distributed system with competing consumers, you rarely get that guarantee. Instead, you often encounter race conditions where the state changes arrive out of sequence:

The hard truth: You cannot force your infrastructure to guarantee order across all failure modes. Instead of trying to prevent the disorder, you must design your system to handle it. That job belongs to idempotency.

![Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-2.webp)

The events were published in order. They were not handled in order. Techniques such as single consumers, partitioned queues (Kafka partitions, SQS FIFO queues, message groups, Azure Service Bus sessions), and chained workflows can restore per-aggregate ordering. None of them makes the system correct on their own.

> That job belongs to idempotency.

## 🔁 Idempotency as the Foundation

Idempotency means that processing the same message twice produces the same result as processing it once.

Retries and redeliveries are the default behavior of most brokers, not edge cases. Even with perfect per-key ordering, a consumer that crashes after completing its work but before acknowledging the message will see it again. If the handler is not idempotent, side effects happen twice.

> Ordering buys you sequence. Idempotency buys you correctness.

## 🛠️ What to check when creating idempotent consumers

### 1. Natural idempotency💡

When we talk about Natural Idempotency, we mean designing your code to be repetition-proof.

The simplest way to understand this is by comparing a Light Switch and a Bell.

- The Light Switch (Idempotent): If you flick a light switch to the “ON” position, the light is on. If you flick it again - even ten times - the light stays on. The state of the room is “on,” no matter how many times you perform the action.

Why it’s safe: If you run this once, SET status = 'CANCELLED',the order is canceled. If you run it again by accident, the order remains canceled. The result is always the same.

- The Bell (Non-Idempotent): If you press a doorbell, it rings. If you push it again, it rings again. Each time you perform the action, the outcome changes (the bell rings one more time).

Why it’s risky: If your system hiccups and runs this code twice, SET retry_count = retry_count + 1,your counter will be wrong. You wanted to add 1 to the count, but you accidentally added 2.

```text
// Idempotent: setting a status is safe to repeat
await db.ExecuteAsync(
"UPDATE orders SET status = @status WHERE id = @id",
new { id = orderId, status = "CANCELLED" });

// NOT idempotent: incrementing runs up the counter on every retry
await db.ExecuteAsync(
"UPDATE orders SET retry_count = retry_count + 1 WHERE id = @id",
new { id = orderId });
```

> To decide if your operation is naturally idempotent, ask yourself: “Does this describe a specific destination, or a step in a process?”

To transform a non-idempotent event into an idempotent one, you must move from relative instructions (which accumulate) to an absolute state (which defines an outcome).

Instead of sending a “do this math” event, send an event that defines the new target state. Include a Version to ensure the database only updates if it is in the state you expect.

### - The Event Payload

- Instead of: { "action": "increment_retry" }
- Use: { "order_id": 123, "target_retry": 5, "expected_previous_version": 4 }

### - The Database Logic

Your handler now performs a Conditional Update:

```text
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

Because your code can check that 0 rows were affected, it can safely ignore the duplicate event without causing any math errors. You have effectively turned an action into a fact-check.

### 2. The Inbox pattern📥

The general-purpose approach. You maintain a table of processed message IDs and check it before doing any work, inside the same transaction as the domain write.

![Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-3.webp)

Inbox Pattern

```csharp
public async Task Handle(OrderPlaced msg, Guid messageId)
{
using var tx = await db.BeginTransactionAsync();
var alreadyProcessed = await db.ExecuteScalarAsync(
"SELECT EXISTS (SELECT 1 FROM inbox WHERE message_id = @id)",
new { id = messageId }, tx);

if (alreadyProcessed) return;

await ordersRepo.Insert(msg.OrderId, msg.Amount, tx);

await db.ExecuteAsync(
"INSERT INTO inbox (message_id, processed_at) VALUES (@id, NOW())",
new { id = messageId }, tx);

await tx.CommitAsync();

}
```

The unique constraint on message_id also serves as a safety net. If two consumers process the same message concurrently, one commit wins, and the other fails with a constraint violation that you can treat as a duplicate.

3. Version-based idempotency🔢

Each event carries the aggregate version it was produced from. The handler only applies the event if the stored version matches the expected predecessor. One mechanism handles both duplicates and out-of-order delivery.

![Stop Trusting Your Message Broker: Why Idempotency is the Only Real Guarantee](/images/blog/stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee/image-4.webp)

Version Based Idempotency

```csharp
public async Task Handle(OrderUpdated msg)
{
var rows = await db.ExecuteAsync(@"
UPDATE orders
SET status = @status, version = @newVersion
WHERE id = @id AND version = @expectedVersion",
new {
id = msg.OrderId,
status = msg.Status,
newVersion = msg.Version,
expectedVersion = msg.Version - 1
});

if (rows == 0)
{
var current = await ordersRepo.GetVersion(msg.OrderId);

if (current >= msg.Version) return; // duplicate or stale

throw new OutOfOrderException(current, msg.Version); // gap, retry later
}
}
```

4. Idempotency keys for external calls🌍

When you make an external call (like to Stripe, Twilio, or FedEx), you are essentially blindfolded:

- The Request Phase: You send data into the void.
- The Transit Phase: The network might drop, the external server might crash mid-process, or your own server might time out waiting for a response.
- The Response Phase: You receive an acknowledgment - or you don’t.

If you don’t receive an acknowledgment, you cannot know if the external system:

- Never received the request.
- Received it, processed it, but the response was lost in transit.
- Received it, but it is currently sitting in a queue waiting to be processed.

The idempotency key is a contract between your system and the external system. It shifts the burden of deduplication from your guessing game to the external system’s state machine.

When you include that header, you are changing the API’s behavior from “Do this now” to “Ensure this specific operation has happened.”

- Request Arrival: The external API receives your order-123-payment key.
- The “Key” Check: Before doing any work, it checks: “Have I seen this key before?”
- The Branching Path:

- If New: It processes the request, saves the order-123-payment key, and stores the result (e.g., "Success: Charge ID ch_123").
- If Duplicate: It stops immediately. It does not charge the card again. It fetches the previous result from its storage and returns that exact same response to you.

```text
var response = await httpClient.PostAsJsonAsync(
"https://api.stripe.com/v1/charges",
new { amount = msg.Amount, currency = "usd", source = msg.Token },
new Dictionary
{
["Idempotency-Key"] = $"order-{msg.OrderId}-payment"
}
);
```

This complements the inbox rather than replacing it. The local transaction protects your database; the idempotency key protects the external system.

## Closing Thought 💭

At the end of the day, network failures aren’t edge cases; they are a mathematical certainty. By treating every message as a potential duplicate and every operation as a potential retry, you move from a brittle system that hopes for order to a resilient system that thrives in chaos. Don’t build for the happy path where packets arrive perfectly; build for the real path where packets arrive twice, late, or not at all. Make your code boring, predictable, and - above all - idempotent
