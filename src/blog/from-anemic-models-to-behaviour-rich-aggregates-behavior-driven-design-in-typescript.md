---
seoTitle: Behavior-Driven Domain Models in TypeScript
slug: from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript
tag: Architecture
title: From Anemic Models to Behaviour-rich Aggregates: Behavior-Driven Design in TypeScript
subtitle: There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just a OrderService file with 300 lines of…
intro: There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just a OrderService file with 300 lines of…
date: July 3, 2026
readTime: 5 min read
mediumUrl: https://medium.com/@arg-software/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-2789fc16762d
---
![From Anemic Models to Behaviour-rich Aggregates: Behavior-Driven Design in TypeScript](/images/blog/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-header.webp)

There’s a class of bug that doesn’t really look like a bug. No stack trace. No obvious failure. Just a OrderService file with 300 lines of logic that was supposed to be somewhere else.

Sound familiar? 😅

This is the anemic domain model in action, and it’s one of the sneakiest design problems in long-lived codebases. Your domain objects are just bags of data. All the real decisions happen in services. The model has no opinions. No self-awareness. No behavior.

Let’s talk about how to change that, in TypeScript.

## 💀 The “God Service” Problem

Here’s a scenario you’ve almost certainly encountered. You open a service file and it’s doing… everything:

```typescript
// orderService.ts async function placeOrder( customerId: string, items: OrderItemDto[] ): Promise { const customer = await db.customers.findById(customerId); if (!customer) throw new Error("Customer not found"); const order: Order = { customerId, items: [], total: 0 }; for (const dto of items) { const stock = await inventoryService.getStock(dto.productId); if (stock sum + i.lineTotal, 0); if (customer.creditUsed + order.total > customer.creditLimit) { throw new Error("Credit limit exceeded"); } await db.orders.save(order); }
```

Looks reasonable at first glance. But let’s count what this function actually knows about:

- 🛒 Pricing rules

- 📦 Inventory availability

- 🏷 VIP discount logic

- 💳 Credit limit enforcement

- 💾 Database persistence

That’s five distinct responsibilities crammed into one function. Every time a new business rule lands, a developer will open this file and add another if. Tests get harder to write. Bugs get easier to hide.

This is the anemic model trap.

## 🤔 Why Does This Happen?

It’s not laziness, it’s gravity. Services are where things happen, so that’s where logic ends up. Domain objects, meanwhile, are often plain interfaces or simple classes with no behavior:

```typescript
// Order is just a shape — it holds data but makes no decisions interface Order { customerId: string; items: OrderItem[]; total: number; }
```

When your domain objects are empty vessels, of course all the logic flows elsewhere. The fix isn’t just structural, it’s philosophical. Your domain objects should protect their own rules.

## 🛠 Refactoring Toward a Behavior-Rich Aggregate

Let’s pull the logic back where it belongs, step by step, without a big-bang rewrite.

## Step 1 - Make the Aggregate Build Itself 🏗

Instead of the service constructing an order from scratch, give the Order class a static factory method. That method becomes the gatekeeper.

```typescript
// order.ts export class Order { private _items: OrderItem[] = []; private _total: number = 0; private constructor(public readonly customerId: string) {} static async create( customer: Customer, lines: Array, pricingService: PricingService, inventoryService: InventoryService ): Promise { const order = new Order(customer.id); for (const { productId, quantity } of lines) { const stock = await inventoryService.getStock(productId); if (stock < quantity) { throw new Error(`Product ${productId} is out of stock`); } const unitPrice = await pricingService.getPrice(productId); order.addItem(productId, quantity, unitPrice, customer.isVip); } order.ensureCreditWithinLimit(customer); return order; } // ... }
```

Now creation fails fast the moment any business rule is violated, and the service doesn’t have to know any of the details. 🎯

## Step 2 - Guard the Internal State 🔒

The aggregate now owns what goes inside it. No one outside can shove items in directly:

```csharp
// order.ts (continued) get items(): ReadonlyArray { return this._items; } get total(): number { return this._total; } private addItem( productId: string, quantity: number, unitPrice: number, isVip: boolean ): void { if (quantity sum + item.lineTotal, 0); } private ensureCreditWithinLimit(customer: Customer): void { if (customer.creditUsed + this._total > customer.creditLimit) { throw new Error("This order would exceed the customer's credit limit"); } }
```

Notice what happened: 👇

- _items is private, nobody outside can push to it

- total is always recalculated consistently

- The credit check lives right next to the total that it validates

This is encapsulation doing real work, not just hiding fields.

## Step 3 - Let the Service Be Boring 😴

Once the aggregate handles its own invariants, the application service becomes almost embarrassingly simple:

```typescript
// orderService.ts (after) async function placeOrder( customerId: string, lines: Array ): Promise { const customer = await db.customers.findById(customerId); if (!customer) throw new Error("Customer not found"); const order = await Order.create(customer, lines, pricingService, inventoryService); await db.orders.save(order); }
```

That’s it. The service went from 40+ lines to about 8. And crucially, it contains zero business logic. It fetches, creates, and persists. That’s pure orchestration. ✨

## 📊 Before vs. After

![From Anemic Models to Behaviour-rich Aggregates: Behavior-Driven Design in TypeScript](/images/blog/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript/from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript-2.webp)

## ✅ What You Actually Gained

## 🧪 Tests that don’t need a database

Before, testing the VIP discount meant wiring up a fake DB, a fake inventory service, and a fake pricing service. Now:

```typescript
it("applies a 5% discount for VIP customers", async () => { const vipCustomer = { id: "c1", isVip: true, creditUsed: 0, creditLimit: 1000 }; const order = await Order.create( vipCustomer, [{ productId: "p1", quantity: 2 }], { getPrice: async () => 100 }, { getStock: async () => 10 } ); expect(order.items[0].unitPrice).toBe(95); // 5% off });
```

Fast. Focused. No infrastructure needed. 🚀

## Rules live where the data lives

The “Tell, Don’t Ask” principle - instead of the service asking the order how much it costs and then checking the credit limit itself, it tells the order to enforce the credit rule. The data and its constraints stay together.

## 🔍 The domain becomes readable

Six months from now, a new engineer will open Order.ts and find all the business rules for an order in one place. No hunting through service files or guessing where the VIP logic ended up.

## 🧩 A Note on Pragmatism

Pushing PricingService and InventoryService into the domain factory might feel weird , aren't services infrastructure concerns?

It depends on how you look at it. What we’re really saying is: “the act of creating an order requires knowing prices and checking stock - those are inherently part of what it means to place an order.”

If that feels like too much coupling, there’s another approach: validate stock asynchronously through domain events after the fact. Both are legitimate. The right call depends on your consistency requirements and how comfortable your team is with eventual consistency.

Start with the simpler model. Reach for events when the simpler model hurts. 💡

## 🏁 Where to Go From Here

You don’t need a rewrite. You don’t need to DDD-ify everything.

Pick one bloated service. Find the one business rule that’s most clearly “hiding” in there. Pull it into the aggregate. See how it feels. Then do the next one.

That’s how anemic codebases evolve into ones where the code actually describes the business, where reading Order.create() tells you what it means to place an order, not just what buttons to push in a database.

The model should know what it is. Let it.
