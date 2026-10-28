---
slug: database-per-service
order: 8
title: Database per Service Pattern
seoTitle: Database per Service Pattern in Microservices
subtitle: Each microservice owns its data and nobody else touches it: the database per service pattern, how services share data through events, and C# and TypeScript examples.
category: Distributed Systems
tags: Microservices, Data Ownership, Events
relatedPosts: stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee
relatedPatterns: saga, transactional-outbox, idempotent-consumer
date: October 28, 2026
dateModified: October 28, 2026
---
In the database per service pattern, each service owns its data and is the only one allowed to read or write it. Other services get that data through the owner's API or its events, never by connecting to its tables.

## The problem

Two services that share tables are one service with two deployments. A column rename in the catalog breaks the orders service. Nobody can change the schema without coordinating every team, and a slow report from one service locks rows another service needs.

## How the database per service pattern works

- **Ownership:** each service has its own schema or database, and its own credentials. No cross-service joins.
- **Queries across services:** ask the owner through its API, or keep a local copy of the fields you need.
- **Local copies:** the owner publishes events when its data changes, and consumers update their copy. That copy is eventually consistent, which is usually fine for names and prices on an order screen.
- **Writes across services:** use a [saga](/patterns/saga/) instead of a distributed transaction.

The ownership boundary matters more than the hardware. Separate schemas on one database server with separate credentials can be a good start.

## C# example

The ordering service owns its schema and keeps a snapshot of only the catalog fields it uses:

```csharp
using Microsoft.EntityFrameworkCore;

// The ordering service owns this schema. No other service connects to it.
public sealed class OrderingDbContext(DbContextOptions<OrderingDbContext> options) : DbContext(options)
{
    public DbSet<ProductSnapshot> Products => Set<ProductSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.HasDefaultSchema("ordering");
}

// A local copy of the catalog data that ordering needs, and nothing more.
public sealed class ProductSnapshot
{
    public Guid Id { get; init; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public long Version { get; set; }
}

public sealed record ProductChanged(Guid ProductId, string Name, decimal Price, long Version);

public sealed class ProductChangedHandler(OrderingDbContext db)
{
    public async Task Handle(ProductChanged e, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([e.ProductId], ct);
        if (product is null)
        {
            product = new ProductSnapshot { Id = e.ProductId };
            db.Products.Add(product);
        }
        else if (product.Version >= e.Version)
        {
            return; // Stale or duplicate event.
        }

        product.Name = e.Name;
        product.Price = e.Price;
        product.Version = e.Version;
        await db.SaveChangesAsync(ct);
    }
}
```

`HasDefaultSchema` comes with any relational EF Core provider, such as Npgsql or SQL Server.

## TypeScript example

The same update as a single upsert. The version guard keeps an older event from overwriting newer data:

```typescript
interface Sql {
  query<Row = unknown>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
}


interface ProductChanged {
  productId: string;
  name: string;
  priceCents: number;
  version: number;
}

// Ordering keeps its own copy of the catalog data it needs.
// The version guard drops stale and duplicate events.
export async function onProductChanged(db: Sql, event: ProductChanged) {
  await db.query(
    `INSERT INTO ordering.product_snapshot AS p (id, name, price_cents, version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, price_cents = EXCLUDED.price_cents, version = EXCLUDED.version
       WHERE p.version < EXCLUDED.version`,
    [event.productId, event.name, event.priceCents, event.version]
  );
}
```

## When to use it

- Services owned by different teams that need to deploy and change schemas independently.
- Services with very different storage needs, such as a search index next to a relational database.
- When you are splitting a monolith and want clear data boundaries before splitting deployments.

## When to avoid it

- One small team running a few services: a modular monolith with one database and clear module boundaries is often simpler.
- Data that needs strong consistency across what you planned as separate services. That's a sign the boundary is in the wrong place.

## FAQ

- **Can services share one database server?** Yes, if each service has its own schema and credentials and none reads another's tables.
- **How do I run reports across services?** Feed events or replicas into a reporting store built for queries, rather than joining live service databases.
- **What about foreign keys between services?** You lose them. Store the other service's ID and validate through its API or your local copy.
- **How do I keep the local copy correct?** Publish changes through a [transactional outbox](/patterns/transactional-outbox/), apply them with an [idempotent consumer](/patterns/idempotent-consumer/), and use versions to drop stale events.
