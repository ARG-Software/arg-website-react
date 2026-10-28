---
slug: idempotent-consumer
order: 3
title: Idempotent Consumer Pattern
seoTitle: Idempotent Consumer Pattern: Handle Duplicate Messages
subtitle: Message brokers redeliver. The idempotent consumer pattern uses an inbox table and a unique key so processing a message twice has the same effect as processing it once, in C# and TypeScript.
category: Distributed Systems
tags: Idempotency, Inbox, Messaging
relatedPosts: stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee
relatedPatterns: transactional-outbox, saga
date: October 28, 2026
dateModified: October 28, 2026
---
An idempotent consumer is a message handler where processing the same message more than once has the same durable effect as processing it once.

It is how event-driven systems stay correct when the broker, the network, or a relay delivers a message twice.

## The problem

Brokers such as Kafka, RabbitMQ, and Azure Service Bus deliver at least once in practice. A consumer that times out before acknowledging gets the message again. An [outbox relay](/patterns/transactional-outbox/) that crashes republishes. Without a guard, the customer is invoiced twice.

## How the idempotent consumer pattern works

1. Every message carries a stable ID, set once by the producer.
2. The consumer records that ID in an `inbox` table with a primary key on `(consumer, message_id)`.
3. The insert into the inbox and the business change commit in the same transaction.
4. If the insert hits the key, the message was already processed: acknowledge it and do nothing.

The database constraint does the work. A "check first, then insert" lookup without the constraint races when two copies arrive at the same time.

## C# example

With Dapper and PostgreSQL, `ON CONFLICT DO NOTHING` claims the message ID atomically:

```csharp
using System.Data.Common;
using Dapper;

public sealed record OrderPlaced(Guid OrderId, decimal Amount);

public sealed class OrderPlacedConsumer(DbConnection db)
{
    public async Task Handle(OrderPlaced message, Guid messageId, CancellationToken ct)
    {
        await using var tx = await db.BeginTransactionAsync(ct);

        // The primary key on (consumer, message_id) is the real guard.
        var claimed = await db.ExecuteScalarAsync<int?>(
            """
            INSERT INTO inbox (consumer, message_id, processed_at)
            VALUES ('billing', @messageId, now())
            ON CONFLICT (consumer, message_id) DO NOTHING
            RETURNING 1
            """,
            new { messageId },
            tx);

        if (claimed is null) return; // Seen before: acknowledge and move on.

        await db.ExecuteAsync(
            "INSERT INTO invoices (order_id, amount) VALUES (@OrderId, @Amount)",
            message,
            tx);

        await tx.CommitAsync(ct);
    }
}
```

## TypeScript example

```typescript
interface Sql {
  query<Row = unknown>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
}


interface OrderPlaced {
  orderId: string;
  amountCents: number;
}

export async function handleOrderPlaced(db: Database, messageId: string, event: OrderPlaced) {
  await db.transaction(async tx => {
    // The primary key on (consumer, message_id) is the real guard.
    const claimed = await tx.query(
      `INSERT INTO inbox (consumer, message_id, processed_at)
       VALUES ('billing', $1, now())
       ON CONFLICT (consumer, message_id) DO NOTHING
       RETURNING 1`,
      [messageId]
    );

    if (claimed.rows.length === 0) return; // Seen before: acknowledge and move on.

    await tx.query('INSERT INTO invoices (order_id, amount_cents) VALUES ($1, $2)', [
      event.orderId,
      event.amountCents,
    ]);
  });
}
```

## When to use it

- Any consumer whose side effects matter: payments, invoices, emails, stock changes.
- Messages published through an outbox or any at-least-once broker, which is nearly all of them.
- Calls to external APIs: pass the message ID on as an idempotency key, for example to a payment provider.

## When to avoid it

- The operation is already naturally idempotent, such as "set status to shipped" guarded by the current state.
- Read-only consumers that only refresh a cache.

## FAQ

- **Doesn't Kafka exactly-once solve this?** Kafka transactions cover Kafka offsets and Kafka records. A database write or a payment API call is outside that transaction, so you still need idempotency there.
- **How long should I keep inbox rows?** At least as long as a duplicate can still arrive, which depends on broker retention and retry policies. Many teams keep days to weeks and clean up on a schedule.
- **Does idempotency fix message ordering?** No. Ordering needs partition keys and versions, as in the version check shown in the [database per service](/patterns/database-per-service/) example.
- **Where does the message ID come from?** The producer sets it once. With an outbox, the outbox row ID is a good choice.
