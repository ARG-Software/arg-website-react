---
seoTitle: Behavior-Driven Domain Models in TypeScript
slug: from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: Architecture
tags: Architecture, Backend
title: From Anemic Models to Behaviour-rich Aggregates: Behavior-Driven Design in TypeScript
subtitle: There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just an OrderService file with 300 lines of…
intro: There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just an OrderService file with 300 lines of…
date: July 3, 2026
dateModified: September 17, 2026
reviewedOn: September 17, 2026
readTime: 9 min read
mediumUrl: https://medium.com/@arg-software/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-2789fc16762d
---
![From Anemic Models to Behaviour-rich Aggregates: Behavior-Driven Design in TypeScript](/images/blog/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-header.webp)

There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just an OrderService file with 300 lines of logic that was supposed to be somewhere else.

Sound familiar?

This is the anemic domain model in action, and it’s one of the sneakiest design problems in long-lived codebases. Your domain objects are just bags of data. All the real decisions happen in services. The model has no opinions. No self-awareness. No behavior.

Let’s talk about how to change that, in TypeScript.

## The “God Service” Problem

Here’s a scenario you’ve almost certainly encountered. You open a service file and it’s doing… everything:

```typescript
// orderService.ts
async function placeOrder(
  customerId: string,
  items: OrderItemDto[],
): Promise<void> {
  const customer = await db.customers.findById(customerId);
  if (!customer) throw new Error("Customer not found");

  const order: Order = { customerId, items: [], total: 0 };
  for (const dto of items) {
    const stock = await inventoryService.getStock(dto.productId);
    if (stock < dto.quantity) {
      throw new Error("Item out of stock");
    }
    const price = await pricingService.getPrice(dto.productId);
    let lineTotal = price * dto.quantity;
    if (customer.isVip) {
      lineTotal *= 0.95; // 5% VIP discount
    }
    order.items.push({
      productId: dto.productId,
      quantity: dto.quantity,
      unitPrice: price,
      lineTotal,
    });
  }
  order.total = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
  if (customer.creditUsed + order.total > customer.creditLimit) {
    throw new Error("Credit limit exceeded");
  }
  await db.orders.save(order);
}
```

Looks reasonable at first glance. But let’s count what this function actually knows about:

- Pricing rules

- Inventory availability

- VIP discount logic

- Credit limit enforcement

- Database persistence

That’s five concerns crammed into one function. Every time a new business rule lands, a developer will open this file and add another if. Tests get harder to write. Bugs get easier to hide.

The database and external service calls belong in orchestration. The discount, line total, and order state rules do not. Mixing them is the anemic model trap.

## Why Does This Happen?

It’s not laziness; it’s gravity. Services are where things happen, so that’s where logic ends up. Domain objects, meanwhile, are often plain interfaces or simple classes with no behavior:

```typescript
// Order is just a shape — it holds data but makes no decisions
interface Order {
  customerId: string;
  items: OrderItem[];
  total: number;
}
```

When your domain objects are empty vessels, of course all the logic flows elsewhere. The fix isn’t just structural; it’s philosophical. Domain objects should protect the rules and invariants inside their own consistency boundary. They should not absorb every rule or integration involved in the wider workflow.

## Refactoring Toward a Behavior-Rich Aggregate

Let’s pull the logic back where it belongs, step by step, without a big-bang rewrite.

### Step 1 - Make the Aggregate Build Itself

Instead of the service constructing an order from scratch, give the Order class a synchronous factory method. The application service supplies a customer snapshot and a valid pricing quote; the aggregate decides whether those inputs can form a valid order.

```typescript
// order.ts
export type CustomerSnapshot = {
  id: string;
  isVip: boolean;
};

export type PricedOrderLine = {
  productId: string;
  quantity: number;
  unitPriceInCents: number;
};

export type PricingQuote = {
  id: string;
  validUntil: Date;
  lines: ReadonlyArray<PricedOrderLine>;
};

export type OrderItem = Readonly<{
  productId: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
}>;

type OrderStatus = "pending" | "placed" | "rejected";

export class Order {
  private readonly orderItems: OrderItem[] = [];
  private total = 0;
  private orderStatus: OrderStatus = "pending";
  private rejectionReason?: string;
  private stockReservationId?: string;
  private creditAuthorizationId?: string;

  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly pricingQuoteId: string,
    private readonly pricingQuoteValidUntil: number,
  ) {}

  static create(
    id: string,
    customer: CustomerSnapshot,
    quote: PricingQuote,
    placedAt = new Date(),
  ): Order {
    if (quote.lines.length === 0) {
      throw new Error("An order must contain at least one item");
    }
    if (quote.validUntil.getTime() <= placedAt.getTime()) {
      throw new Error("The pricing quote has expired");
    }

    const order = new Order(
      id,
      customer.id,
      quote.id,
      quote.validUntil.getTime(),
    );
    for (const line of quote.lines) {
      order.addItem(line, customer.isVip);
    }
    return order;
  }

  get items(): ReadonlyArray<OrderItem> {
    return [...this.orderItems];
  }

  get totalInCents(): number {
    return this.total;
  }

  get status(): OrderStatus {
    return this.orderStatus;
  }

  get reservations(): Readonly<{
    stockReservationId: string;
    creditAuthorizationId: string;
  }> | undefined {
    if (!this.stockReservationId || !this.creditAuthorizationId) {
      return undefined;
    }
    return {
      stockReservationId: this.stockReservationId,
      creditAuthorizationId: this.creditAuthorizationId,
    };
  }

  place(
    stockReservationId: string,
    creditAuthorizationId: string,
    placedAt = new Date(),
  ): void {
    if (this.orderStatus !== "pending") {
      throw new Error("Only a pending order can be placed");
    }
    if (this.pricingQuoteValidUntil <= placedAt.getTime()) {
      throw new Error("The pricing quote has expired");
    }
    if (!stockReservationId || !creditAuthorizationId) {
      throw new Error("Stock and credit must be reserved before placement");
    }

    this.stockReservationId = stockReservationId;
    this.creditAuthorizationId = creditAuthorizationId;
    this.orderStatus = "placed";
  }

  reject(reason: string): void {
    if (this.orderStatus !== "pending") {
      throw new Error("Only a pending order can be rejected");
    }
    if (!reason) {
      throw new Error("A rejection reason is required");
    }

    this.rejectionReason = reason;
    this.orderStatus = "rejected";
  }

  private addItem(line: PricedOrderLine, isVip: boolean): void {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }
    if (!Number.isInteger(line.unitPriceInCents) || line.unitPriceInCents < 0) {
      throw new Error("Unit price must be a non-negative integer number of cents");
    }

    const unitPriceInCents = isVip
      ? Math.round(line.unitPriceInCents * 0.95)
      : line.unitPriceInCents;
    const item: OrderItem = {
      productId: line.productId,
      quantity: line.quantity,
      unitPriceInCents,
      lineTotalInCents: unitPriceInCents * line.quantity,
    };

    this.orderItems.push(item);
    this.total += item.lineTotalInCents;
  }
}
```

Now creation fails fast when an order invariant is violated. Pricing remains owned by the pricing boundary, while the order records the quote and applies its own VIP rule.

### Step 2 - Guard the Internal State

The aggregate now owns what goes inside it. No one outside can shove items in directly. Its methods validate a complete state change before mutating the order.

Notice what happened:

- orderItems is private, so nobody outside can push to it

- quantities and prices are validated before they enter the order

- totals use integer cents and one explicit rounding rule

- a pending order cannot become placed without reservation references

This is encapsulation doing real work, not just hiding fields.

### Step 3 - Let the Service Be Boring

Once the aggregate handles its own invariants, the application service can focus on orchestration. Asynchronous pricing and persistence dependencies stay here rather than moving into the aggregate:

```typescript
// orderService.ts (after)
import {
  Order,
  type CustomerSnapshot,
  type OrderItem,
  type PricingQuote,
} from "./order";

type PlaceOrderCommand = {
  orderId: string;
  customerId: string;
  lines: ReadonlyArray<{ productId: string; quantity: number }>;
};

type OrderPlacementRequested = {
  orderId: string;
  customerId: string;
  items: ReadonlyArray<OrderItem>;
  totalInCents: number;
};

interface CustomerRepository {
  findById(id: string): Promise<CustomerSnapshot | null>;
}

interface PricingService {
  quote(lines: PlaceOrderCommand["lines"]): Promise<PricingQuote>;
}

interface OrderRepository {
  save(order: Order): Promise<void>;
}

interface PlacementRequestOutbox {
  add(request: OrderPlacementRequested): Promise<void>;
}

interface UnitOfWork {
  execute(work: () => Promise<void>): Promise<void>;
}

export class PlaceOrderService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly pricing: PricingService,
    private readonly orders: OrderRepository,
    private readonly placementRequests: PlacementRequestOutbox,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<void> {
    const customer = await this.customers.findById(command.customerId);
    if (!customer) throw new Error("Customer not found");

    const quote = await this.pricing.quote(command.lines);
    const order = Order.create(command.orderId, customer, quote);

    await this.unitOfWork.execute(async () => {
      await this.orders.save(order);
      await this.placementRequests.add({
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        totalInCents: order.totalInCents,
      });
    });
  }
}
```

The service still has an important job. It coordinates repositories and external capabilities, while decisions about valid order state remain in the aggregate. Saving the pending order and its outbox request in one local transaction also avoids losing the request after the order is saved. That separation is more useful than chasing a service with zero lines of logic.

A durable process manager consumes that request. It asks the inventory boundary to reserve stock atomically, asks the credit boundary to authorize the total, and then sends the result back to an application service. That service loads the order and calls either `order.place(...)` or `order.reject(...)`. Each boundary commits its own transaction. If a later step fails, the process releases earlier reservations. This is a [saga](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga), so retries must be idempotent and the process state must be persisted.

## Before vs. After

![TypeScript behavior-driven design aggregate model example](/images/blog/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-2.webp)

## What You Actually Gained

### Tests that don’t need a database

Before, testing the VIP discount meant wiring up a fake DB, a fake inventory service, and a fake pricing service. Now the domain test is synchronous:

```typescript
it("applies a 5% discount for VIP customers", () => {
  const order = Order.create(
    "o1",
    { id: "c1", isVip: true },
    {
      id: "q1",
      validUntil: new Date("2026-07-03T12:05:00Z"),
      lines: [{ productId: "p1", quantity: 2, unitPriceInCents: 10_000 }],
    },
    new Date("2026-07-03T12:00:00Z"),
  );

  expect(order.items[0].unitPriceInCents).toBe(9_500);
  expect(order.totalInCents).toBe(19_000);
});
```

Fast. Focused. No infrastructure needed.

### Rules live at the boundary that owns them

The order protects quantities, discount calculation, totals, and valid state transitions because those rules govern its own state. Inventory owns stock availability. A credit account owns available credit. The application layer coordinates them without reaching into the order and setting fields directly.

That boundary matters for consistency. Checking `getStock()` and later saving an order leaves a race in which another request can consume the same units. An atomic reservation is stronger. Likewise, a price fetched once is only a snapshot; if the business promises to honour it, use an identifiable quote with an expiry and persist that quote reference on the order.

### The domain becomes readable

Six months from now, a new engineer will open Order.ts and find the rules that belong to an order in one place. No hunting through service files or guessing where the VIP logic ended up.

## A Note on Pragmatism

Not every noun deserves an aggregate, and not every rule that affects checkout belongs inside Order. In DDD, an aggregate [protects invariants across changes](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-model-layer-validations) to the objects inside its boundary. [Application services](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-application-layer-implementation-web-api) load data, invoke domain behaviour, coordinate other boundaries, and persist the result.

That leaves a deliberate choice for stock and credit. Separate aggregates should normally change in separate transactions and coordinate through events or a process manager. If the business truly requires one immediate atomic decision, reconsider the aggregate boundaries rather than hiding several boundaries inside one transaction. Across remote services, immediate atomic consistency is unavailable, so model the workflow explicitly, make retries idempotent, and decide how reservations expire or are compensated. A pending order is valid only when the business accepts that temporary state and eventual consistency.

Start with the smallest boundary that protects the invariants you truly need. Reach for events and process managers when the consistency boundary genuinely crosses systems.

## Where to Go From Here

You don’t need a rewrite. You don’t need to DDD-ify everything.

Pick one bloated service. Find the business rule that is most clearly hiding in there. Decide which boundary owns it, then move it to that model. See how it feels. Then do the next one.

That’s how anemic codebases evolve into ones where the code actually describes the business, where reading Order.create() tells you what a valid order is and the application service shows how it is placed.

The model should know what it is. Let it.
