---
seoTitle: Pure TypeScript DDD: Practical Persistence Ignorance with MikroORM
slug: pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm
tag: Architecture
tags: Architecture, Backend
title: Pure TypeScript DDD: Practical Persistence Ignorance with MikroORM
subtitle: Decouple your business logic from your database. Discover how to build pure TypeScript DDD applications using MikroORM
intro: Decouple your business logic from your database. Discover how to build pure TypeScript DDD applications using MikroORM
date: April 13, 2026
dateModified: September 17, 2026
reviewedOn: September 17, 2026
readTime: 9 min read
---
### How to decouple your Domain Model from the database layer to build scalable, testable, and future-proof enterprise systems.

![Pure TypeScript DDD: Practical Persistence Ignorance with MikroORM](/images/blog/pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm/pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm-header.webp)

You’ve read the books. You’ve studied Domain-Driven Design (DDD). You’ve carefully crafted a src/domain folder in your TypeScript project, ready to isolate your core business logic from the messy outside world.

Then, you install your ORM and do this:

```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

// This domain class now owns MikroORM mapping metadata.
@Entity()
export class User {
  @PrimaryKey()
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  isActive!: boolean;
}
```

Decorators do not turn this into Active Record. MikroORM follows the [Data Mapper pattern](https://martinfowler.com/eaaCatalog/dataMapper.html): persistence is coordinated by an `EntityManager` or repository, while an Active Record object would expose methods such as `save()` itself. Decorators are still ORM metadata inside the domain class, however, so they create a framework dependency that we may prefer to keep outside the domain boundary.

Persistence Ignorance is a useful DDD goal: the domain model should avoid depending on how and where it is stored. It does not make persistence concerns disappear, and an ORM or database change can still require mapping and application changes, but core business behavior is less likely to move with those details.

Let’s look at a complete, top-to-bottom example of how to implement a “User Registration” feature using pure TypeScript DDD, external MikroORM `EntitySchema` metadata, and explicit error handling. Current MikroORM documentation foregrounds [`defineEntity` and decorated classes](https://mikro-orm.io/docs/defining-entities); `EntitySchema` remains useful when keeping mapping metadata outside an existing domain class is the deliberate tradeoff.

## 🏛️ The Architecture Breakdown

To keep our codebase scalable, we will organize our code into four distinct layers:

- 💎 Domain: Business logic without ORM dependencies.
- ⚙️ Application: Orchestrates use cases. Talks to the domain and interfaces.
- 🏗️ Infrastructure: Implementations of interfaces (MikroORM, external APIs).
- 🚦 Presentation: The entry point (Express/Fastify controllers).

## 1. The Domain Layer (The Pure Core) 💎

First, let’s strip away the ORM dependency. Our Domain Entity is a plain TypeScript class. It protects its invariants (business rules) by hiding its constructor and mutating state only through intentional methods.

```typescript
// src/domain/User.ts
import { fail, ok, type Result } from '../shared/Result';

// 🚀 Look ma, no ORM decorators! Plain TypeScript.
export class User {
  // 1. Private constructor prevents invalid state creation
  private constructor(
    private readonly _id: string,
    private _email: string,
    private _isActive: boolean,
  ) {}

  // 2. Static factory method returns a Result instead of throwing
  public static create(email: string): Result<User, string> {
    if (!email.includes('@')) {
      return fail('Invalid email format.');
    }

    return ok(new User(crypto.randomUUID(), email, true));
  }

  // 3. Intent-revealing methods for business logic
  public deactivate(): void {
    this._isActive = false;
  }

  // 4. Public read access, with mutation still controlled by the entity
  public get id(): string {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get isActive(): boolean {
    return this._isActive;
  }
}
```

For the examples below, `Result` is a small discriminated union. Keeping one result shape across the domain, use case, and controller makes every return type explicit:

```typescript
// src/shared/Result.ts
export type Result<T, E> =
  | { readonly isSuccess: true; readonly value: T }
  | { readonly isSuccess: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { isSuccess: true, value };
}

export function fail<E>(error: E): Result<never, E> {
  return { isSuccess: false, error };
}
```

Alongside the entity, we define the Repository Interface. This contract lives in the Domain layer, but we won’t implement it here (in the User class).

```typescript
// src/domain/IUserRepository.ts
import { User } from './User';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

## 2. The Application Layer (The Orchestrator) ⚙️

The Application layer contains our Use Cases. It doesn’t know about HTTP requests or SQL queries. It simply coordinates the pure User entity and the IUserRepository contract.

```typescript
// src/application/useCases/RegisterUserUseCase.ts
import { IUserRepository } from '../../domain/IUserRepository';
import { User } from '../../domain/User';
import { fail, ok, type Result } from '../../shared/Result';

export class RegisterUserUseCase {
  // 💉 We inject the INTERFACE, not the MikroORM implementation!
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(email: string): Promise<Result<User, string>> {
    // 1. Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      return fail('Email already in use.');
    }

    // 2. Create the domain entity
    const userResult = User.create(email);
    if (!userResult.isSuccess) {
      return userResult;
    }

    // 3. Save via interface
    await this.userRepository.save(userResult.value);

    return ok(userResult.value);
  }
}
```

## 3. The Infrastructure Layer (The Secret Sauce) 🏗️

One common misconception in the Node.js ecosystem is that using an ORM always requires decorators in the model.

MikroORM also exposes the `EntitySchema` API, allowing us to define this mapping externally. The important detail for this class is that its persisted properties are private backing fields with public getters. The schema maps the public property names and uses `accessor` to tell MikroORM which backing fields to hydrate.

```typescript
// src/infrastructure/database/schemas/UserSchema.ts
import { EntitySchema } from '@mikro-orm/core';
import { User } from '../../../domain/User';

// 💡 We define database mapping here, outside the Domain
export const UserSchema = new EntitySchema<User>({
  // MikroORM supports private constructors at runtime; this assertion bridges
  // the public-constructor constraint in EntitySchema's TypeScript type.
  class: User as any,
  tableName: 'users',
  properties: {
    id: {
      type: 'uuid',
      primary: true,
      fieldName: 'id',
      accessor: '_id',
    },
    email: {
      type: 'string',
      unique: true,
      fieldName: 'email',
      accessor: '_email',
    },
    isActive: {
      type: 'boolean',
      fieldName: 'is_active',
      accessor: '_isActive',
    },
  },
});
```

Register `UserSchema` in MikroORM's `entities` configuration, then implement the repository interface. MikroORM can create loaded entities without calling their constructor and hydrate the mapped backing fields. TypeScript `private` fields are ordinary JavaScript properties at runtime; native `#private` fields need a different setup using accessors and `forceConstructor`, as covered in MikroORM's [entity constructor](https://mikro-orm.io/docs/entity-constructors#using-native-private-properties) and [private property accessor](https://mikro-orm.io/docs/defining-entities#private-property-accessors) documentation.

```typescript
// src/infrastructure/repositories/MikroOrmUserRepository.ts
import { EntityManager } from '@mikro-orm/core';
import { IUserRepository } from '../../domain/IUserRepository';
import { User } from '../../domain/User';

export class MikroOrmUserRepository implements IUserRepository {
  constructor(private readonly em: EntityManager) {}

  public findByEmail(email: string): Promise<User | null> {
    // 🛡️ Returns our domain class, not a separate persistence model
    return this.em.findOne(User, { email });
  }

  public async save(user: User): Promise<void> {
    // 🪄 MikroORM tracks the class through its Unit of Work
    await this.em.persist(user).flush();
  }
}
```

## 4. The Presentation Layer & Error Handling 🚦

In a robust DDD architecture, we must draw a hard line between Expected Domain Errors (business rule violations we catch gracefully) and Unexpected System Exceptions (database crashes). Generalizing all errors is a massive anti-pattern.

Here is how we use the Presentation layer as a boundary to separate them:

```typescript
// src/presentation/controllers/UserController.ts
import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../application/useCases/RegisterUserUseCase';

export class UserController {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = req.body as { email: string };

      // 1. Execute the use case
      const result = await this.registerUserUseCase.execute(email);

      // 2. 🛡️ Handle EXPECTED Domain Errors (Business Rules)
      if (!result.isSuccess) {
        res.status(400).json({ error: result.error });
        return;
      }

      // 3. Success
      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
      // 🚨 Handle UNEXPECTED System Exceptions (Database down, etc.)
      // Pass it down to the global error handler middleware
      next(error);
    }
  };
}
```

### The Global Safety Net 🛟

Instead of handling database errors directly in the controller, we pass them to a global middleware. This ensures that infrastructure details (like SQL syntax errors) are never accidentally leaked to the client.

```typescript
// src/presentation/middleware/GlobalErrorHandler.ts
import { Request, Response, NextFunction } from 'express';
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Log the actual stack trace to your observability platform
  console.error('[CRITICAL INFRASTRUCTURE ERROR] 💥', err);

  // 2. Return a generic, sanitized response to the client
  res.status(500).json({
    error: 'An unexpected internal server error occurred. Our team has been notified.',
  });
}
```

## 📈 The ROI of Persistence Ignorance

Taking the time to structure your codebase this way provides massive dividends as your application scales:

- ⚡️ Fast Unit Tests: You can test your RegisterUserUseCase and User entity in seconds. Swap the IUserRepository with an in-memory mock, and you don't even need a database container.
- 🔓 Less Framework Lock-in: If you move from MikroORM to Drizzle, TypeORM, or raw SQL next year, the domain model is insulated from much of that change. Repository contracts or application queries may still need to evolve when persistence capabilities differ.
- 🧠 A Clearer Mental Model: When you open a file in the domain folder, you are looking at business rules rather than ORM mapping. When you open a file in the infrastructure folder, you are looking at plumbing.

Stop letting your database dictate your architecture. Clean up your domain, drop the decorators, and let vanilla TypeScript do what it does best.

## 🐘 The “We Will Never Swap Our Database” Myth

Whenever someone advocates for Persistence Ignorance, the immediate counter-argument is always the same: “How often do you actually swap out your database? Almost never. Why over-engineer for an impossible scenario?”

It is a fair question, but it completely misses the point of decoupling.

Yes, migrating an enterprise application from PostgreSQL to MongoDB happens once in a blue moon. But treating Persistence Ignorance as merely a “database swapping insurance policy” ignores the massive, daily ROI of a pure domain.

You don’t decouple your core logic from your ORM just so you can swap databases in five years. You decouple it to survive what happens this year:

- 💥 An ORM Major Version Upgrade: You might not swap TypeORM for Prisma, but what happens when your ORM releases a major version with breaking changes to its metadata or base classes? If ORM APIs reach across 80 domain entities, a library upgrade can interrupt product work. With external mapping, most ORM-specific changes stay at the infrastructure boundary.
- 🧪 You “Swap” Your Database 100 Times a Day: Every time you run your unit test suite, you can replace the repository with an in-memory fake. If business behavior calls ORM APIs directly, you may need a database just to test an `if` statement. An ORM-independent domain enables fast unit tests, while integration tests still exercise the real mapping and database.
- 🔪 The Microservice Extraction: As your monolith grows, you might need to extract a specific bounded context (like Billing or Notifications) into its own service. If your business logic is tangled in a massive, interconnected ORM graph, extracting it is a nightmare. A pure domain can be lifted and shifted more easily.
- ⚡️ Performance Overrides: Eventually, a specific read-query using your ORM will become too slow. You will need to bypass the ORM and write highly optimized, raw SQL for that one specific use case. If your application layer expects an ORM object, you are stuck. If it relies on a pure Repository Interface, you can quietly swap the underlying implementation for that specific query without breaking a sweat.

Decoupling your database isn’t about predicting the future. It is about protecting the present. It helps keep your most valuable asset, your core business rules, testable, readable, and under your control.
