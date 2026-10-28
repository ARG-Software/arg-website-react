---
slug: aggregate
order: 9
title: Aggregate Pattern
seoTitle: DDD Aggregate Pattern: C# and TypeScript Examples
subtitle: The DDD aggregate pattern explained: a consistency boundary that protects business rules, with an Order aggregate in C# and TypeScript and the rules for sizing it.
category: Domain-Driven Design
tags: DDD, Aggregate, Invariants
relatedPosts: from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript, pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm, pragmatic-clean-architecture-aspnet-core
relatedPatterns: value-object, event-sourcing, cqrs
date: October 28, 2026
dateModified: October 28, 2026
---
An aggregate is a cluster of domain objects treated as one unit for changes, with one entry point called the aggregate root. All changes go through the root, which enforces the business rules that must always hold true inside the boundary.

## The problem

When any service can change an order's lines or status directly, the rules end up scattered. One endpoint checks that submitted orders can't change, another forgets. The data model is an [anemic domain model](/blog/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript/): bags of properties with all the decisions somewhere else.

## How the aggregate pattern works

- **One root:** outside code holds a reference to the root only, such as `Order`, never to an `OrderLine` directly.
- **Invariants inside:** the root's methods check the rules before changing state, so the aggregate can't reach an invalid state.
- **One aggregate per transaction:** a change saves one aggregate. Changes that span several aggregates go through events or a process manager.
- **Reference by ID:** an order stores `CustomerId`, not a `Customer` object, which keeps boundaries small and loading cheap.

## C# example

```csharp
public enum OrderStatus { Draft, Submitted }

public sealed record OrderLine(Guid ProductId, int Quantity, decimal UnitPrice);

public sealed class Order
{
    private readonly List<OrderLine> _lines = [];

    public Order(Guid customerId) => CustomerId = customerId;

    public Guid Id { get; } = Guid.NewGuid();
    public Guid CustomerId { get; } // Other aggregates are referenced by ID only.
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public IReadOnlyList<OrderLine> Lines => _lines;
    public decimal Total => _lines.Sum(line => line.UnitPrice * line.Quantity);

    public void AddLine(Guid productId, int quantity, decimal unitPrice)
    {
        EnsureDraft();
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));

        var index = _lines.FindIndex(line => line.ProductId == productId);
        if (index >= 0)
            _lines[index] = _lines[index] with { Quantity = _lines[index].Quantity + quantity };
        else
            _lines.Add(new OrderLine(productId, quantity, unitPrice));
    }

    public void Submit()
    {
        EnsureDraft();
        if (_lines.Count == 0) throw new InvalidOperationException("An order needs at least one line.");
        Status = OrderStatus.Submitted;
    }

    private void EnsureDraft()
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Only draft orders can change.");
    }
}
```

## TypeScript example

Private class fields keep the state behind the methods:

```typescript
type OrderStatus = 'draft' | 'submitted';

interface OrderLine {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
}

export class Order {
  #status: OrderStatus = 'draft';
  #lines: OrderLine[] = [];

  // Other aggregates are referenced by ID only.
  constructor(
    readonly id: string,
    readonly customerId: string
  ) {}

  get status() {
    return this.#status;
  }

  get lines(): readonly OrderLine[] {
    return this.#lines;
  }

  get totalCents() {
    return this.#lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  }

  addLine(productId: string, quantity: number, unitPriceCents: number) {
    this.#ensureDraft();
    if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError('Quantity must be positive.');

    const existing = this.#lines.find(line => line.productId === productId);
    this.#lines = existing
      ? this.#lines.map(line =>
          line === existing ? { ...line, quantity: line.quantity + quantity } : line
        )
      : [...this.#lines, { productId, quantity, unitPriceCents }];
  }

  submit() {
    this.#ensureDraft();
    if (this.#lines.length === 0) throw new Error('An order needs at least one line.');
    this.#status = 'submitted';
  }

  #ensureDraft() {
    if (this.#status !== 'draft') throw new Error('Only draft orders can change.');
  }
}
```

## When to use it

- Business rules that must always hold across several related objects, such as "a submitted order can't change".
- Concurrent edits to the same data, where the aggregate is the unit you lock or version.
- A domain with real behavior, not only data entry.

## When to avoid it

- CRUD data with no rules to protect.
- Very large aggregates that load hundreds of children for every change. Split them, or check the rule another way.
- Reporting and list screens: query read models instead of loading aggregates.

## FAQ

- **How big should an aggregate be?** As small as the invariants allow. If a rule doesn't need two objects to change together, they probably belong to different aggregates.
- **Aggregate vs entity: what's the difference?** An entity has an identity. An aggregate is a boundary around one or more entities and value objects, with one entity acting as the root.
- **Can one aggregate reference another?** By ID only. Loading and changing two aggregates in one transaction is a sign the boundary is wrong, or that you need an event between them.
- **Where do rules that span aggregates go?** Into application services, domain events, or process managers, not into one aggregate reaching into another.
