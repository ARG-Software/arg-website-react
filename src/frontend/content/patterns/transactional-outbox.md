---
slug: transactional-outbox
order: 2
title: Transactional Outbox Pattern
seoTitle: Transactional Outbox Pattern in C# and TypeScript
subtitle: Publish events reliably without distributed transactions: the transactional outbox pattern with EF Core in C# and plain SQL in TypeScript, plus the relay that sends them.
category: Distributed Systems
tags: Outbox, EF Core, Messaging
relatedPosts: stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee, pragmatic-clean-architecture-aspnet-core, from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript
relatedPatterns: idempotent-consumer, saga, event-sourcing
date: October 28, 2026
dateModified: October 28, 2026
---
The transactional outbox pattern saves a business change and the event that announces it in the same database transaction.

A separate relay publishes the stored events to the message broker afterwards, so an event is never lost and never sent for a change that rolled back.

## The problem

A handler saves an order and then publishes `OrderPlaced`. If the process crashes between the two, the order exists and nobody hears about it. Publish first and the database write can fail, so consumers react to an order that doesn't exist. The database and the broker can't share one transaction, so "save, then publish" is a dual write that will eventually go wrong.

## How the transactional outbox pattern works

1. In the same transaction as the business change, insert a row into an `outbox` table with the event type and payload.
2. A relay reads unpublished rows in order, publishes them, and marks them as published.
3. Consumers handle duplicates, because the relay can crash after publishing and before marking a row.

The result is at-least-once delivery. That's why the outbox and the [idempotent consumer](/patterns/idempotent-consumer/) go together.

## C# example

With EF Core, one `SaveChangesAsync` call commits the order and the outbox row together:

```csharp
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

public sealed class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Type { get; init; }
    public required string Payload { get; init; }
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
}

public sealed class Order
{
    public Guid Id { get; init; }
    public decimal Total { get; init; }
}

public sealed class OrdersDbContext(DbContextOptions<OrdersDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OutboxMessage> Outbox => Set<OutboxMessage>();
}

public sealed class PlaceOrderHandler(OrdersDbContext db)
{
    public async Task Handle(Order order, CancellationToken ct)
    {
        db.Orders.Add(order);
        db.Outbox.Add(new OutboxMessage
        {
            Type = "OrderPlaced",
            Payload = JsonSerializer.Serialize(new { order.Id, order.Total }),
        });

        // One SaveChanges, one transaction: the order and its event commit together.
        await db.SaveChangesAsync(ct);
    }
}
```

The relay is a hosted service that polls the table:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public interface IMessagePublisher
{
    Task Publish(Guid messageId, string type, string payload, CancellationToken ct);
}

public sealed class OutboxRelay(IServiceScopeFactory scopes, IMessagePublisher publisher)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();

            var batch = await db.Outbox
                .Where(m => m.PublishedAt == null)
                .OrderBy(m => m.OccurredAt)
                .Take(50)
                .ToListAsync(stoppingToken);

            foreach (var message in batch)
            {
                // A crash between these two lines publishes the message again.
                await publisher.Publish(message.Id, message.Type, message.Payload, stoppingToken);
                message.PublishedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(stoppingToken);
            }

            await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
        }
    }
}
```

With more than one relay instance, claim rows with `SELECT ... FOR UPDATE SKIP LOCKED` or run a single relay, so two instances don't publish the same batch. MassTransit and NServiceBus both ship a built-in outbox if you already use one of them. Change data capture tools such as Debezium can replace the polling relay by reading the database log.

## TypeScript example

The same flow with a thin database interface that `pg` or a similar driver can implement:

```typescript
import { randomUUID } from 'node:crypto';
interface Sql {
  query<Row = unknown>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
}


export async function placeOrder(db: Database, orderId: string, totalCents: number) {
  await db.transaction(async tx => {
    await tx.query('INSERT INTO orders (id, total_cents) VALUES ($1, $2)', [orderId, totalCents]);
    await tx.query('INSERT INTO outbox (id, type, payload) VALUES ($1, $2, $3)', [
      randomUUID(),
      'OrderPlaced',
      JSON.stringify({ orderId, totalCents }),
    ]);
  });
}

interface OutboxRow {
  id: string;
  type: string;
  payload: string;
}

export async function relayOutbox(db: Database, publish: (row: OutboxRow) => Promise<void>) {
  const { rows } = await db.query<OutboxRow>(
    'SELECT id, type, payload FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 50'
  );

  for (const row of rows) {
    await publish(row); // A crash after this line publishes the row again.
    await db.query('UPDATE outbox SET published_at = now() WHERE id = $1', [row.id]);
  }
}
```

## When to use it

- A state change must be followed by an event that other services rely on.
- You publish integration events from a service that owns its own database.
- Losing an event would cost money or leave other services out of sync.

## When to avoid it

- Fire-and-forget notifications where a rare lost message is acceptable.
- Everything happens inside one database, so a normal transaction already covers it.
- Your broker and database are the same system with real transactional support for both.

## FAQ

- **Does the outbox give exactly-once delivery?** No. It gives at-least-once delivery. Make consumers idempotent and use the outbox row ID as the message ID.
- **Polling or change data capture?** Polling is simple and fine for most volumes. Change data capture reads the transaction log, adds lower latency, and adds infrastructure to run.
- **Does the outbox keep events in order?** The relay publishes in insert order, but retries and multiple partitions can still reorder delivery. Carry a version per aggregate if order matters.
- **When can I delete outbox rows?** After they are published and past any replay window you need. A scheduled cleanup job keeps the table small.
