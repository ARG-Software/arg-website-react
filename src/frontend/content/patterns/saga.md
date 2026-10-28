---
slug: saga
order: 4
title: Saga Pattern
seoTitle: Saga Pattern: Orchestration in C# and TypeScript
subtitle: Keep data consistent across services without distributed transactions: the saga pattern with compensating actions, orchestration vs choreography, and examples in C# and TypeScript.
category: Distributed Systems
tags: Saga, Microservices, Consistency
relatedPosts:
relatedPatterns: transactional-outbox, idempotent-consumer, database-per-service
date: October 28, 2026
dateModified: October 28, 2026
---
A saga is a sequence of local transactions across services, where each step has a compensating action that undoes it.

When a later step fails, the saga runs the compensations for the steps that already finished, so the system ends in a consistent state without a distributed transaction.

## The problem

Placing an order touches three services: reserve stock, charge the card, create the shipment. Each has its own database, so there's no single transaction to roll back. If shipping fails after the card was charged, something has to refund the customer and release the stock.

## How the saga pattern works

- **Steps** are local transactions, each owned by one service.
- **Compensations** semantically undo a step: refund a payment, release a reservation. They can't erase history, so they add new facts instead.
- **Orchestration** uses a coordinator that tells each service what to do next and tracks the saga's state.
- **Choreography** has no coordinator: each service reacts to the previous service's events. It's simpler for two or three steps and harder to follow beyond that.

## C# example

An orchestrator runs the steps in order and compensates in reverse on failure:

```csharp
using Microsoft.Extensions.Logging;

public sealed class OrderSagaState
{
    public required Guid OrderId { get; init; }
    public required decimal Amount { get; init; }
    public string? PaymentId { get; set; }
}

public interface ISagaStep
{
    string Name { get; }
    Task Execute(OrderSagaState state, CancellationToken ct);
    Task Compensate(OrderSagaState state, CancellationToken ct);
}

public sealed class OrderSaga(IReadOnlyList<ISagaStep> steps, ILogger<OrderSaga> logger)
{
    public async Task<bool> Run(OrderSagaState state, CancellationToken ct)
    {
        var completed = new Stack<ISagaStep>();

        foreach (var step in steps)
        {
            try
            {
                await step.Execute(state, ct);
                completed.Push(step);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Step {Step} failed for order {OrderId}", step.Name, state.OrderId);

                // Undo the finished steps in reverse order.
                while (completed.TryPop(out var done))
                    await done.Compensate(state, CancellationToken.None);

                return false;
            }
        }

        return true;
    }
}
```

Each step pairs an action with its undo, and passes an idempotency key so a retried charge doesn't charge twice:

```csharp
public interface IPayments
{
    Task<string> Charge(Guid orderId, decimal amount, string idempotencyKey, CancellationToken ct);
    Task Refund(string paymentId, CancellationToken ct);
}

public sealed class ChargePayment(IPayments payments) : ISagaStep
{
    public string Name => "ChargePayment";

    public async Task Execute(OrderSagaState state, CancellationToken ct) =>
        state.PaymentId = await payments.Charge(
            state.OrderId, state.Amount, idempotencyKey: $"order:{state.OrderId}", ct);

    public Task Compensate(OrderSagaState state, CancellationToken ct) =>
        state.PaymentId is null ? Task.CompletedTask : payments.Refund(state.PaymentId, ct);
}
```

This in-memory version shows the shape. In production, persist the saga state after every step so a restarted process can resume or compensate. MassTransit state machine sagas and NServiceBus sagas do this on top of a message broker. Temporal does it as durable workflow code.

## TypeScript example

```typescript
export interface SagaStep<State> {
  name: string;
  execute(state: State): Promise<void>;
  compensate(state: State): Promise<void>;
}

export async function runSaga<State>(steps: SagaStep<State>[], state: State): Promise<boolean> {
  const completed: SagaStep<State>[] = [];

  for (const step of steps) {
    try {
      await step.execute(state);
      completed.push(step);
    } catch (error) {
      console.warn(`Saga step ${step.name} failed`, error);

      // Undo the finished steps in reverse order.
      for (const done of completed.reverse()) await done.compensate(state);
      return false;
    }
  }

  return true;
}

interface OrderSagaState {
  orderId: string;
  amountCents: number;
  paymentId?: string;
}

interface Payments {
  charge(orderId: string, amountCents: number, idempotencyKey: string): Promise<string>;
  refund(paymentId: string): Promise<void>;
}

export const chargePayment = (payments: Payments): SagaStep<OrderSagaState> => ({
  name: 'chargePayment',
  async execute(state) {
    state.paymentId = await payments.charge(state.orderId, state.amountCents, `order:${state.orderId}`);
  },
  async compensate(state) {
    if (state.paymentId) await payments.refund(state.paymentId);
  },
});
```

## When to use it

- A business process spans services that each own their data.
- Each step has a meaningful undo, such as refund, release, or cancel.
- Eventual consistency is acceptable for the length of the process.

## When to avoid it

- All the data lives in one database. Use a normal transaction.
- A step can't be compensated, such as sending a physical letter. Put it last, after every step that can fail.
- The flow has many steps and branches with no persisted state. That's a workflow engine's job.

## FAQ

- **Orchestration vs choreography: which should I choose?** Choreography suits short flows with few participants. Orchestration makes longer flows explicit, testable, and observable in one place.
- **What if a compensation fails?** Retry it, because compensations must be idempotent. If it keeps failing, park the saga for manual handling and alert someone.
- **Is a saga the same as two-phase commit?** No. Two-phase commit locks resources across participants until everyone agrees. A saga commits each step immediately and repairs failures afterwards.
- **How do services exchange saga messages reliably?** Publish them through a [transactional outbox](/patterns/transactional-outbox/) and handle them with an [idempotent consumer](/patterns/idempotent-consumer/).
