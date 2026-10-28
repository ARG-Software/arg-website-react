---
slug: value-object
order: 10
title: Value Object Pattern
seoTitle: Value Object Pattern: C# Records and TypeScript
subtitle: Model money, emails, and dates as value objects: immutable types compared by value that validate themselves, with C# records and a TypeScript class.
category: Domain-Driven Design
tags: DDD, Value Object, Immutability
relatedPosts: pragmatic-clean-architecture-aspnet-core
relatedPatterns: aggregate, event-sourcing
date: October 28, 2026
dateModified: October 28, 2026
---
A value object is a small immutable type defined by its values rather than an identity, such as a price, an email address, or a date range.

Two value objects with the same values are equal, and a value object validates itself when it's created, so an invalid one can't exist.

## The problem

When a price is a bare `decimal` and a currency is a bare `string`, nothing stops code from adding euros to dollars, passing a negative amount, or swapping two arguments of the same type. The same validation gets copied into every method that touches the values, and some copies drift.

## How the value object pattern works

- **Immutable:** operations return a new instance instead of changing the current one.
- **Equal by value:** two instances with the same values are equal, whatever their memory address.
- **Self-validating:** the constructor or factory rejects invalid input, so every instance in the system is valid.
- **Behavior included:** operations that belong to the concept, such as adding money in the same currency, live on the type.

## C# example

C# records give value equality for free:

```csharp
public sealed record Money
{
    public Money(decimal amount, string currency)
    {
        if (amount < 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "A price cannot be negative.");
        if (currency is not { Length: 3 } || !currency.All(char.IsAsciiLetterUpper))
            throw new ArgumentException("Use an ISO 4217 code such as EUR.", nameof(currency));

        Amount = amount;
        Currency = currency;
    }

    public decimal Amount { get; }
    public string Currency { get; }

    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new InvalidOperationException($"Cannot add {other.Currency} to {Currency}.");
        return new Money(Amount + other.Amount, Currency);
    }
}

// Records compare by value, so this is true:
// new Money(10m, "EUR") == new Money(10m, "EUR")
```

With EF Core, map value objects as owned types or complex properties, so they're stored as columns of the owning entity.

## TypeScript example

TypeScript classes compare by reference, so equality is an explicit method. Storing money as whole minor units avoids floating-point rounding errors:

```typescript
export class Money {
  private constructor(
    readonly minorUnits: number,
    readonly currency: string
  ) {
    Object.freeze(this);
  }

  static of(minorUnits: number, currency: string): Money {
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
      throw new RangeError('Use a non-negative whole number of minor units, such as cents.');
    }
    if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError('Use an ISO 4217 code such as EUR.');
    return new Money(minorUnits, currency);
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error(`Cannot add ${other.currency} to ${this.currency}.`);
    }
    return Money.of(this.minorUnits + other.minorUnits, this.currency);
  }

  // Compare by value, never with === on two instances.
  equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits && this.currency === other.currency;
  }
}
```

## When to use it

- Concepts with rules but no identity: money, quantities, emails, addresses, date ranges.
- Primitive values that keep getting validated in many places.
- Parameters that are easy to swap by mistake, such as two strings or two numbers in a row.

## When to avoid it

- Values with no rules at all, where a wrapper only adds ceremony.
- Things with an identity that changes over time, such as a customer. That's an entity.

## FAQ

- **Value object vs entity: what's the difference?** An entity has an identity that stays the same while its attributes change. A value object has no identity: change a value and you have a different value object.
- **Should value objects be records in C#?** Records are a good default because they give value equality and immutability with little code. Add validation in the constructor.
- **How do I store money in TypeScript?** As an integer number of minor units, such as cents, plus an ISO 4217 currency code. Avoid floating-point amounts.
- **Can a value object contain another value object?** Yes. A price range can hold two money values, and it stays immutable and compared by value.
