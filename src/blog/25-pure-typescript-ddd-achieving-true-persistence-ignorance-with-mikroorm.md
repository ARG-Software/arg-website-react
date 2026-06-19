---
seoTitle: Pure TypeScript DDD: Achieving True Persistence Ignorance with MikroORM
slug: pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm
tag: Architecture
title: Pure TypeScript DDD: Achieving True Persistence Ignorance with MikroORM
subtitle: You’ve read the books. You’ve studied Domain-Driven Design (DDD). You’ve carefully crafted a src/domain folder in your TypeScript project, ready...
intro: You’ve read the books. You’ve studied Domain-Driven Design (DDD). You’ve carefully crafted a src/domain folder in your TypeScript project, ready...
date: April 13, 2026
readTime: 9 min read
excerpt: You’ve read the books. You’ve studied Domain-Driven Design (DDD). You’ve carefully crafted a src/domain folder in your TypeScript project, ready to isolate your core business logic from the messy outside
---
### How to decouple your Domain Model from the database layer to build scalable, testable, and future-proof enterprise systems.

![Pure TypeScript DDD: Achieving True Persistence Ignorance with MikroORM](/images/blog/pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm/pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm-header.webp)

You’ve read the books. You’ve studied Domain-Driven Design (DDD). You’ve carefully crafted a src/domain folder in your TypeScript project, ready to isolate your core business logic from the messy outside world.

Then, you install your ORM and do this:

```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
// 💀 This is NOT a Domain Entity. This is an Active Record database model.
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

If your “Domain Entities” are littered with @Entity() or @Column() decorators, you aren't doing Domain-Driven Design. You are building an Active Record architecture wrapped in a folder named "domain."

The most fundamental rule of DDD is Persistence Ignorance. Your domain layer shouldn’t know how it is saved, where it is saved, or what library is doing the saving. If you decide to swap your database or ORM tomorrow, your core business rules should not require a single line of code to change.

Let’s look at a complete, top-to-bottom example of how to implement a “User Registration” feature using pure TypeScript DDD, leveraging MikroORM’s powerful (but hidden) EntitySchema, and handling errors like a pro.

## 🏛️ The Architecture Breakdown

To keep our codebase scalable, we will organize our code into four distinct layers:

- 💎 Domain: Pure business logic. No frameworks allowed.
- ⚙️ Application: Orchestrates use cases. Talks to the domain and interfaces.
- 🏗️ Infrastructure: Implementations of interfaces (MikroORM, external APIs).
- 🚦 Presentation: The entry point (Express/Fastify controllers).

## 1. The Domain Layer (The Pure Core) 💎

First, let’s strip away all the framework bloat. A true Domain Entity should be a plain TypeScript class. It protects its invariants (business rules) by hiding its constructor and mutating state only through intentional methods.

```typescript
// src/domain/User.ts
import { Result } from '../core/Result';
// 🚀 Look ma, no decorators! Pure TypeScript.
export class User {
// 1. Private constructor prevents invalid state creation
private constructor(
private readonly id: string,
private email: string,
private isActive: boolean,
) {}
// 2. Static factory method for creation (Returns a Result instead of throwing!)
public static create(email: string): Result {
if (!email.includes('@')) {
return Result.fail("Invalid email format.");
}

return Result.ok(new User(crypto.randomUUID(), email, true));
}
// 3. Intent-revealing methods for business logic
public deactivate(): void {
this.isActive = false;
}

// 4. Pragmatic getters for the Infrastructure layer to read state
get getId() { return this.id; }
get getEmail() { return this.email; }
get getIsActive() { return this.isActive; }
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
import { Result } from '../../core/Result';

export class RegisterUserUseCase {
// 💉 We inject the INTERFACE, not the MikroORM implementation!
constructor(private readonly userRepository: IUserRepository) {}
async execute(email: string): Promise> {
// 1. Check if user exists
const existingUser = await this.userRepository.findByEmail(email);
if (existingUser) {
return Result.fail("Email already in use.");
}
// 2. Create pure domain entity
const userOrError = User.create(email);
if (userOrError.isFailure) {
return Result.fail(userOrError.getError());
}
// 3. Save via interface
await this.userRepository.save(userOrError.getValue());

return Result.ok();
}
}
```

## 3. The Infrastructure Layer (The Secret Sauce) 🏗️

The biggest misconception in the Node.js ecosystem is that using an ORM requires you to pollute your models with decorators.

While decorators are the default for MikroORM, the framework also provides the EntitySchema API. This allows you to define your database mapping completely externally.

```typescript
// src/infrastructure/database/schemas/UserSchema.ts
import { EntitySchema } from '@mikro-orm/core';
import { User } from '../../../domain/User';

// 💡 We define the database rules HERE, keeping the Domain completely pure
export const UserSchema = new EntitySchema({
class: User, // Point MikroORM directly at our pure TypeScript class
tableName: 'users',
properties: {
id: { type: 'uuid', primary: true, fieldName: 'id' },
email: { type: 'string', unique: true, fieldName: 'email' },
isActive: { type: 'boolean', fieldName: 'is_active' }
},
});
```

Now we implement the Repository interface. Because MikroORM understands our vanilla class through the schema, it handles hydration automatically.

```typescript
// src/infrastructure/repositories/MikroOrmUserRepository.ts
import { EntityManager } from '@mikro-orm/core';
import { IUserRepository } from '../../domain/IUserRepository';
import { User } from '../../domain/User';

export class MikroOrmUserRepository implements IUserRepository {
constructor(private readonly em: EntityManager) {}
async findByEmail(email: string): Promise {
// 🛡️ Returns a pure Domain object, not a bloated Active Record model
return await this.em.findOne(User, { email });
}
async save(user: User): Promise {
// 🪄 MikroORM tracks the pure class in its Unit of Work!
this.em.persist(user);
await this.em.flush();
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
public register = async (req: Request, res: Response, next: NextFunction): Promise => {
try {
const { email } = req.body;
// 1. Execute the use case
const result = await this.registerUserUseCase.execute(email);
// 2. 🛡️ Handle EXPECTED Domain Errors (Business Rules)
if (result.isFailure) {
res.status(400).json({ error: result.getError() });
return;
}
// 3. Success
res.status(201).json({ message: "User registered successfully." });
} catch (error) {
// 🚨 Handle UNEXPECTED System Exceptions (Database down, etc.)
// Pass it down to the global error handler middleware
next(error);
}
}
}
```

### The Global Safety Net 🛟

Instead of handling database errors directly in the controller, we pass them to a global middleware. This ensures that infrastructure details (like SQL syntax errors) are never accidentally leaked to the client.

```typescript
// src/presentation/middleware/GlobalErrorHandler.ts
import { Request, Response, NextFunction } from 'express';
export function globalErrorHandler(
err: Error,
req: Request,
res: Response,
next: NextFunction
) {
// 1. Log the actual stack trace to your observability platform
console.error('[CRITICAL INFRASTRUCTURE ERROR] 💥', err);
// 2. Return a generic, sanitized response to the client
res.status(500).json({
error: "An unexpected internal server error occurred. Our team has been notified."
});
}
```

## 📈 The ROI of True Persistence Ignorance

Taking the time to structure your codebase this way provides massive dividends as your application scales:

- ⚡️ Fast Unit Tests: You can test your RegisterUserUseCase and User entity in seconds. Swap the IUserRepository with an in-memory mock, and you don't even need a database container.
- 🔓 Zero Framework Lock-in: If you decide to move from MikroORM to Drizzle, TypeORM, or raw SQL next year, your src/domain and src/application folders remain completely untouched.
- 🧠 A Clearer Mental Model: When you open a file in the domain folder, you are looking exclusively at pure business rules. When you open a file in the infrastructure folder, you are looking at plumbing.

Stop letting your database dictate your architecture. Clean up your domain, drop the decorators, and let vanilla TypeScript do what it does best.

## 🐘 The “We Will Never Swap Our Database” Myth

Whenever someone advocates for Persistence Ignorance, the immediate counter-argument is always the same: “How often do you actually swap out your database? Almost never. Why over-engineer for an impossible scenario?”

It is a fair question, but it completely misses the point of decoupling.

Yes, migrating an enterprise application from PostgreSQL to MongoDB happens once in a blue moon. But treating Persistence Ignorance as merely a “database swapping insurance policy” ignores the massive, daily ROI of a pure domain.

You don’t decouple your core logic from your ORM just so you can swap databases in five years. You decouple it to survive what happens this year:

- 💥 A ORM Major Version Upgrade: You might not swap TypeORM for Prisma, but what happens when your ORM releases a major version with breaking changes to its decorators or base classes? If your ORM is injected into 80 domain entities, a library upgrade halts product development for some time. If your domain is pure, you only update the infrastructure layer.
- 🧪 You “Swap” Your Database 100 Times a Day: Every time you run your unit test suite, you are essentially swapping your database for an in-memory mock. If your domain entities are tightly coupled to an Active Record ORM, you are forced to spin up a Docker container or SQLite database just to test a if/else statement in your business rules. Pure domains enable test suites that run in milliseconds, not minutes.
- 🔪 The Microservice Extraction: As your monolith grows, you might need to extract a specific bounded context (like Billing or Notifications) into its own service. If your business logic is tangled in a massive, interconnected ORM graph, extracting it is a nightmare. A pure domain can be lifted and shifted more easily.
- ⚡️ Performance Overrides: Eventually, a specific read-query using your ORM will become too slow. You will need to bypass the ORM and write highly optimized, raw SQL for that one specific use case. If your application layer expects an ORM object, you are stuck. If it relies on a pure Repository Interface, you can quietly swap the underlying implementation for that specific query without breaking a sweat.

Decoupling your database isn’t about predicting the future. It is about protecting the present. It ensures that your most valuable asset, your core business rules, remains testable, readable, and entirely under your control.

## About the Author

We’re a team of senior engineers who’ve shipped production systems across finance, fintech, and the nonprofit sector — for organizations like the Gates Foundation, JP Morgan, Interledger, and Filecoin, among others. At Arg, we help teams navigate the technical decisions that actually matter. Follow us for more practical deep dives into the technologies shaping modern development.
