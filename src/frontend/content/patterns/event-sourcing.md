---
slug: event-sourcing
order: 5
title: Event Sourcing Pattern
seoTitle: Event Sourcing Pattern: C# and TypeScript Examples
subtitle: Store every change as an event and rebuild state by replaying them: the event sourcing pattern with a C# aggregate and a functional TypeScript version, plus when not to use it.
category: Distributed Systems
tags: Event Sourcing, Events, Audit
relatedPosts: ai-architectural-changes-nobody-wants
relatedPatterns: cqrs, aggregate, transactional-outbox
date: October 28, 2026
dateModified: October 28, 2026
---
Event sourcing stores the state of an entity as the ordered list of events that happened to it, instead of only its latest values. Current state is rebuilt by replaying those events, and the event log doubles as a complete history of every change.

## The problem

A row that says `balance = 120` doesn't say how it got there. Audit tables bolted on later miss changes, drift from the real data, and can't answer "what did this account look like last Tuesday?" Some domains, such as ledgers and compliance-heavy workflows, need that history as a first-class fact.

## How the event sourcing pattern works

1. A command loads the entity by replaying its events, in order.
2. Business rules decide whether the change is allowed and produce new events.
3. The store appends the new events with an expected version. If someone else appended first, the write fails and the command retries. That's optimistic concurrency.
4. Projections read the event stream and build query models, which is where [CQRS](/patterns/cqrs/) comes in.

Long streams can be loaded faster from a snapshot plus the events after it.

## C# example

The aggregate separates decisions (`Withdraw`) from state changes (`Apply`):

```csharp
public abstract record AccountEvent;
public sealed record AccountOpened(Guid AccountId) : AccountEvent;
public sealed record MoneyDeposited(decimal Amount) : AccountEvent;
public sealed record MoneyWithdrawn(decimal Amount) : AccountEvent;

public sealed class BankAccount
{
    private readonly List<AccountEvent> _pending = [];

    public Guid Id { get; private set; }
    public decimal Balance { get; private set; }
    public int Version { get; private set; }
    public IReadOnlyList<AccountEvent> PendingEvents => _pending;

    public static BankAccount FromHistory(IEnumerable<AccountEvent> history)
    {
        var account = new BankAccount();
        foreach (var e in history) account.Apply(e);
        return account;
    }

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Raise(new MoneyDeposited(amount));
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (amount > Balance) throw new InvalidOperationException("Insufficient funds.");
        Raise(new MoneyWithdrawn(amount));
    }

    private void Raise(AccountEvent e)
    {
        Apply(e);
        _pending.Add(e);
    }

    // Apply only changes state. The rules live in the methods above.
    private void Apply(AccountEvent e)
    {
        switch (e)
        {
            case AccountOpened opened: Id = opened.AccountId; break;
            case MoneyDeposited deposited: Balance += deposited.Amount; break;
            case MoneyWithdrawn withdrawn: Balance -= withdrawn.Amount; break;
        }
        Version++;
    }
}
```

Append `PendingEvents` with the expected version equal to the version before the new events were raised. Marten on PostgreSQL and KurrentDB (formerly EventStoreDB) are common event stores in .NET.

## TypeScript example

A functional version: a pure `evolve` function folds events into state, and decisions return new events:

```typescript
type AccountEvent =
  | { type: 'AccountOpened'; accountId: string }
  | { type: 'MoneyDeposited'; amountCents: number }
  | { type: 'MoneyWithdrawn'; amountCents: number };

interface AccountState {
  id: string;
  balanceCents: number;
  version: number;
}

const initialState: AccountState = { id: '', balanceCents: 0, version: 0 };

// Pure: old state + event = new state. No rules, no I/O.
function evolve(state: AccountState, event: AccountEvent): AccountState {
  const version = state.version + 1;
  switch (event.type) {
    case 'AccountOpened':
      return { ...state, id: event.accountId, version };
    case 'MoneyDeposited':
      return { ...state, balanceCents: state.balanceCents + event.amountCents, version };
    case 'MoneyWithdrawn':
      return { ...state, balanceCents: state.balanceCents - event.amountCents, version };
  }
}

export const rehydrate = (history: AccountEvent[]) => history.reduce(evolve, initialState);

// Decisions read state and return new events; the store appends them.
export function withdraw(state: AccountState, amountCents: number): AccountEvent[] {
  if (amountCents <= 0) throw new RangeError('Amount must be positive.');
  if (amountCents > state.balanceCents) throw new Error('Insufficient funds.');
  return [{ type: 'MoneyWithdrawn', amountCents }];
}
```

## When to use it

- The history itself has business value: ledgers, bookings, regulated workflows.
- You need to rebuild read models or answer questions you didn't plan for, from the full history.
- The domain already talks in events, such as "deposited", "shipped", "cancelled".

## When to avoid it

- CRUD data where only the latest value matters.
- Teams new to the pattern on a deadline. Versioning events, rebuilding projections, and handling personal data take real effort.
- Personal data that must be deleted on request, unless you plan for it up front, for example by encrypting it with a per-person key you can destroy.

## FAQ

- **Is event sourcing the same as event-driven architecture?** No. Event-driven architecture is about services communicating through events. Event sourcing is about how one service stores its own state. You can have either without the other.
- **Do I need CQRS with event sourcing?** In practice, usually. Querying across replayed streams is slow, so projections build read models for queries.
- **How do I change an event's shape?** Never edit stored events. Add a new version and upcast old events when reading them.
- **Can I query the current state with SQL?** Not from the event table directly. Build a projection into ordinary tables and query those.
