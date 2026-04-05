---
slug: typescript-dependency-injection-without-framework
tag: TypeScript · Architecture
title: TypeScript Dependency Injection Without the Framework (And Why You Might Prefer It)
subtitle: You've seen the decorators. You've wrestled with reflect-metadata. What if you didn't need any of it?
date: March 3, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/typescript-dependency-injection-without-the-framework-and-why-you-might-prefer-it-8e78d77b6735
excerpt: This article walks through building a fully functional dependency injection system in TypeScript — no decorators, no reflect-metadata, no NestJS, no InversifyJS. Just the language itself. By the end, you'll understand DI deeply enough that reaching for a framework becomes a conscious choice, not a default.
---

![Typescript Dependency Injection without the Framework](/images/articles/typescript-dependency-injection-without-the-framework/typescript-dependency-injection-without-the-framework-header.webp)

You've seen the decorators. You've wrestled with reflect-metadata. You've written @Injectable() on a hundred classes and trusted the framework to wire everything together. It works - until it doesn't.

Circular dependencies that only crash at runtime. Eager instantiation that slows your startup. Test files bloated with mocking boilerplate. The framework gave you superpowers, but it also made you dependent on its magic.

What if you didn't need any of it?

This article walks through building a fully functional dependency injection system in TypeScript - no decorators, no reflect-metadata, no NestJS, no InversifyJS. Just the language itself. By the end, you'll understand DI deeply enough that reaching for a framework becomes a conscious choice, not a default.

## Why Frameworks Hide the Complexity You Need to Understand

Dependency injection is fundamentally simple: don't construct your dependencies inside a class; receive them from the outside. That's it. The rest is convenience infrastructure that frameworks layer on top.

Here's what most developers skip: how object graphs are composed, the difference between transient, scoped, and singleton lifetimes, why circular dependencies are a design smell and not a wiring problem, and how to make DI fully type-safe at compile time.

When you build it yourself, these concepts become concrete. Let's start from zero.

## Step 1: The Simplest Possible DI - Manual Wiring

Before we build anything clever, let's appreciate how far pure constructor injection gets us:

```typescript
// services.ts
class Logger {
  log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

class UserRepository {
  constructor(private logger: Logger) {}
  findById(id: string) {
    this.logger.log(`Fetching user ${id}`);
    // ... db call
  }
}

class UserService {
  constructor(private repo: UserRepository, private logger: Logger) {}
  getUser(id: string) {
    this.logger.log(`UserService.getUser called`);
    return this.repo.findById(id);
  }
}

// Composition root - one place where the graph is built
const logger = new Logger();
const repo = new UserRepository(logger);
const userService = new UserService(repo, logger);
```

This is already dependency injection. UserService doesn't know how to create a Logger - it just uses one. Testing becomes trivial:

```typescript
const mockLogger = { log: jest.fn() };
const mockRepo = { findById: jest.fn().mockResolvedValue({ id: '1', name: 'Alice' }) };
const service = new UserService(mockRepo as any, mockLogger as any);
// No framework. No magic. Completely predictable.
```

The problem surfaces at scale. When you have 40+ services, manually composing the object graph at startup becomes error-prone and tedious. That's what a container solves.

## Step 2: Building a Type-Safe Container

Let's build the container ourselves. Our goals: register services with string or symbol tokens, resolve dependencies recursively, support singleton and transient lifetimes, and catch errors at registration time, not runtime.

```typescript
// container.ts
type Token<T> = string | symbol;
type Factory<T> = (container: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  lifetime: 'singleton' | 'transient';
  instance?: T;
}

export class Container {
  private registrations = new Map<Token<unknown>, Registration<unknown>>();

  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    lifetime: 'singleton' | 'transient' = 'singleton'
  ) {
    this.registrations.set(token, { factory, lifetime });
  }

  resolve<T>(token: Token<T>): T {
    const registration = this.registrations.get(token) as Registration<T> | undefined;
    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }
    if (registration.lifetime === 'singleton') {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance;
    }
    return registration.factory(this);
  }
}
```

Now let's wire up our services:

```typescript
// tokens.ts - centralized, type-safe token definitions
export const TOKENS = {
  Logger: Symbol('Logger'),
  UserRepository: Symbol('UserRepository'),
  UserService: Symbol('UserService'),
} as const;

// bootstrap.ts
const container = new Container();
container.register(TOKENS.Logger, () => new Logger());
container.register(TOKENS.UserRepository, (c) =>
  new UserRepository(c.resolve(TOKENS.Logger))
);
container.register(TOKENS.UserService, (c) =>
  new UserService(
    c.resolve(TOKENS.UserRepository),
    c.resolve(TOKENS.Logger)
  )
);

// Anywhere in your app:
const userService = container.resolve<UserService>(TOKENS.UserService);
```

Clean, explicit, and completely transparent. TypeScript knows the types. Your IDE autocompletes. No magic.

## Step 3: Scoped Lifetimes (The Part Frameworks Abstract Away)

Singleton means one instance forever. Transient means a new instance each time. But there's a third lifetime that most apps need: scoped - one instance per request (or per unit of work).

This is where frameworks typically shine and where hand-rolled containers start to become more complex. Here's a clean implementation:

```typescript
export class ScopedContainer extends Container {
  private scopedTokens = new Set<Token<unknown>>();

  registerScoped<T>(token: Token<T>, factory: Factory<T>) {
    // Mark as scoped, register as transient in parent
    this.scopedTokens.add(token);
    super.register(token, factory, 'transient');
  }

  createScope(): Container {
    const scope = new Container();
    for (const [token, reg] of (this as any).registrations) {
      if (this.scopedTokens.has(token)) {
        // Scoped: acts as singleton within this scope only
        scope.register(token, reg.factory, 'singleton');
      } else {
        scope.register(token, reg.factory, reg.lifetime);
      }
    }
    return scope;
  }
}

// Usage in an Express middleware:
app.use((req, res, next) => {
  (req as any).scope = rootContainer.createScope();
  next();
});
```

Each HTTP request gets its own scope. Database connections, authenticated user contexts, request-level caches - all scoped cleanly without framework magic.

## Step 4: Making It Fully Type-Safe with Phantom Types

The Achilles heel of token-based DI is that container.resolve(TOKENS.UserService) returns unknown unless you explicitly pass a generic type parameter. Let's fix that permanently with a typed token using a phantom type:

```typescript
// typed-token.ts
export class TypedToken<T> {
  // This property is never assigned at runtime - it's purely a type-level trick
  // that lets TypeScript infer T from the token itself
  readonly _type!: T;

  constructor(public readonly description: string) {}
}

// tokens.ts
export const TOKENS = {
  Logger: new TypedToken<Logger>('Logger'),
  UserRepository: new TypedToken<UserRepository>('UserRepository'),
  UserService: new TypedToken<UserService>('UserService'),
};

// container.ts - updated resolve signature
resolve<T>(token: TypedToken<T>): T {
  const registration = this.registrations.get(token) as Registration<T> | undefined;
  if (!registration) {
    throw new Error(`No registration found for: ${token.description}`);
  }
  if (registration.lifetime === 'singleton') {
    if (!registration.instance) {
      registration.instance = registration.factory(this);
    }
    return registration.instance;
  }
  return registration.factory(this);
}
```

Now container.resolve(TOKENS.UserService) returns a fully-typed UserService - inferred automatically from the token definition. No explicit generics needed. No casting. Full IDE support.

```typescript
// Before (manual generic, ugly):
const svc = container.resolve<UserService>(TOKENS.UserService);

// After (inferred from token, clean):
const svc = container.resolve(TOKENS.UserService); // type is UserService ✅
```

## When to Reach for a Framework Anyway

We are not arguing that frameworks are bad. We use NestJS in production. The point is that you should choose it with open eyes.

Reach for a framework when you need AOP concerns like logging, caching, or auth applied declaratively across methods via interceptors, your team is large and needs enforced conventions over architectural decisions, or you're building microservices and need the full ecosystem: Guards, Pipes, built-in OpenAPI, WebSockets, etc.

Stay framework-free when you're building a library (pulling in NestJS as a peer dependency is a non-starter), startup time matters (eager instantiation in large containers adds hundreds of ms), or you want zero magic in your test suite (framework DI often requires spinning up a test module just to resolve a single service).

## The Real Takeaway

The decorator-based DI you see in NestJS and InversifyJS isn't the correct way to do dependency injection in TypeScript. It's one way, optimized for ergonomics at the cost of explicitness.

The pattern we built here - factory functions, typed tokens, a simple container - is arguably more TypeScript-idiomatic. It uses the language's strengths (generics, inference, structural typing) rather than workarounds with runtime reflection.

Build it once from scratch. You'll never look at a framework's container the same way again.
