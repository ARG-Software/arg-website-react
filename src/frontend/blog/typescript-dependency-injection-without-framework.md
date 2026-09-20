---
seoTitle: TypeScript DI Without a Framework
slug: typescript-dependency-injection-without-framework
tag: Architecture
tags: Architecture, Backend
title: TypeScript Dependency Injection Without the Framework (And Why You Might Prefer It)
subtitle: Learn to build a type-safe DI container in TypeScript from scratch — no NestJS, no decorators, no reflect-metadata. Just pure TypeScript.
intro: Learn to build a type-safe DI container in TypeScript from scratch — no NestJS, no decorators, no reflect-metadata. Just pure TypeScript.
date: March 3, 2026
dateModified: September 17, 2026
reviewedOn: September 17, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/typescript-dependency-injection-without-the-framework-and-why-you-might-prefer-it-8e78d77b6735
---

![Typescript Dependency Injection without the Framework](/images/blog/typescript-dependency-injection-without-the-framework/typescript-dependency-injection-without-the-framework-header.webp)

You've seen the decorators. You've wrestled with reflect-metadata. You've written @Injectable() on a hundred classes and trusted the framework to wire everything together. It works - until it doesn't.

Circular dependencies that only crash at runtime. Eager instantiation that can slow your startup. Test files bloated with mocking boilerplate. The framework gave you superpowers, but it also made you dependent on its magic.

What if you didn't need any of it?

This article walks through building a small dependency injection system in TypeScript - no decorators, no reflect-metadata, no NestJS, no InversifyJS. Just the language itself. By the end, you'll understand DI deeply enough that reaching for a framework becomes a conscious choice, not a default.

## Why Frameworks Hide the Complexity You Need to Understand

Dependency injection is fundamentally simple: don't construct your dependencies inside a class; receive them from the outside. That's it. The rest is convenience infrastructure that frameworks layer on top.

Here's what most developers skip: how object graphs are composed, the difference between transient, scoped, and singleton lifetimes, why circular dependencies are usually a design smell rather than a wiring problem, and what TypeScript can actually guarantee at compile time.

When you build it yourself, these concepts become concrete. Let's start from zero.

## Step 1: The Simplest Possible DI - Manual Wiring

Before we build anything clever, let's appreciate how far pure constructor injection gets us:

```typescript
// services.ts
interface User {
  id: string;
  name: string;
}

interface ILogger {
  log(message: string): void;
}

interface IUserRepository {
  findById(id: string): Promise<User | undefined>;
}

class Logger implements ILogger {
  log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

class UserRepository implements IUserRepository {
  constructor(private logger: ILogger) {}

  async findById(id: string): Promise<User | undefined> {
    this.logger.log(`Fetching user ${id}`);
    // ... db call
    return undefined;
  }
}

class UserService {
  constructor(
    private repo: IUserRepository,
    private logger: ILogger
  ) {}

  getUser(id: string) {
    this.logger.log('UserService.getUser called');
    return this.repo.findById(id);
  }
}

// Composition root - one place where the graph is built
const logger = new Logger();
const repo = new UserRepository(logger);
const userService = new UserService(repo, logger);
```

This is already dependency injection. UserService doesn't know how to create a Logger - it just uses one. Testing becomes trivial, and the interfaces let structural typing do its job without a cast:

```typescript
const messages: string[] = [];
const mockLogger: ILogger = {
  log: (message) => messages.push(message),
};
const mockRepo: IUserRepository = {
  findById: async (id) => ({ id, name: 'Alice' }),
};

const service = new UserService(mockRepo, mockLogger);
// No framework. No magic. Completely predictable.
```

The problem surfaces at scale. When you have 40+ services, manually composing the object graph at startup becomes error-prone and tedious. That's what a container solves.

## Step 2: Building a Type-Safe Container

Let's build the container ourselves. Our goals: register services with string or symbol tokens, infer the service type from the token, resolve dependencies lazily, support singleton, scoped, and transient lifetimes, and fail clearly on missing or circular registrations.

There is an important boundary here. TypeScript can reject an unknown token or a factory returning the wrong type at compile time. It cannot prove that every service was registered because registration happens at runtime, so a missing registration still needs a runtime error.

The key is a service map. Each key is a token and each value is the service that token represents. This preserves the relationship that a loose `Token<T> = string | symbol` alias loses. The official [TypeScript generics documentation](https://www.typescriptlang.org/docs/handbook/2/generics.html) describes the same principle: a type parameter should carry information from an input to the corresponding output rather than erase it with `any`.

```typescript
// container.ts
type Lifetime = 'singleton' | 'scoped' | 'transient';

interface Resolver<Services extends object> {
  resolve<Token extends keyof Services>(token: Token): Services[Token];
}

type Factory<Services extends object, Token extends keyof Services> = (
  resolver: Resolver<Services>
) => Services[Token];

interface Registration<Services extends object, Service> {
  factory: (resolver: Resolver<Services>) => Service;
  lifetime: Lifetime;
}

type Registry<Services extends object> = {
  [Token in keyof Services]?: Registration<Services, Services[Token]>;
};

type InstanceCache<Services extends object> = {
  [Token in keyof Services]?: { value: Services[Token] };
};

export class Container<Services extends object>
  implements Resolver<Services>
{
  private readonly root: Container<Services>;
  private readonly registrations: Registry<Services>;
  private readonly singletons: InstanceCache<Services>;
  private readonly scopedInstances?: InstanceCache<Services>;

  constructor(root?: Container<Services>) {
    this.root = root ?? this;
    this.registrations = root?.registrations ?? Object.create(null);
    this.singletons = root?.singletons ?? Object.create(null);
    this.scopedInstances = root ? Object.create(null) : undefined;
  }

  register<Token extends keyof Services>(
    token: Token,
    factory: Factory<Services, Token>,
    lifetime: Lifetime = 'singleton'
  ): void {
    if (this !== this.root) {
      throw new Error('Register services on the root container');
    }
    if (this.registrations[token]) {
      throw new Error(`Token already registered: ${String(token)}`);
    }
    this.registrations[token] = { factory, lifetime };
  }

  createScope(): Container<Services> {
    return new Container(this.root);
  }

  resolve<Token extends keyof Services>(token: Token): Services[Token] {
    return this.resolveWithPath(token, []);
  }

  private resolveWithPath<Token extends keyof Services>(
    token: Token,
    path: (keyof Services)[]
  ): Services[Token] {
    if (path.includes(token)) {
      const cycle = [...path, token].map(String).join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.registrations[token];
    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }

    let owner: Container<Services> = this;
    let cache: InstanceCache<Services> | undefined;

    if (registration.lifetime === 'singleton') {
      owner = this.root;
      cache = this.root.singletons;
    } else if (registration.lifetime === 'scoped') {
      if (!this.scopedInstances) {
        throw new Error(`Scoped service resolved outside a scope: ${String(token)}`);
      }
      cache = this.scopedInstances;
    }

    const cached = cache?.[token];
    if (cached) {
      return cached.value;
    }

    path.push(token);
    try {
      const resolver: Resolver<Services> = {
        resolve: <Dependency extends keyof Services>(dependency: Dependency) =>
          owner.resolveWithPath(dependency, path),
      };
      const value = registration.factory(resolver);

      if (cache) {
        cache[token] = { value };
      }
      return value;
    } finally {
      path.pop();
    }
  }
}
```

The cache stores a wrapper object rather than testing the service value for truthiness. That detail matters: a valid singleton factory can return `undefined`, `false`, `0`, or an empty string, and it must still run only once.

Circular resolution is also checked before invoking another factory. The container now reports the path, such as `userService -> userRepository -> userService`, instead of recursing until the stack overflows.

Now let's wire up our services:

```typescript
interface AppServices {
  logger: ILogger;
  userRepository: IUserRepository;
  userService: UserService;
}

const container = new Container<AppServices>();

container.register('logger', () => new Logger());
container.register('userRepository', (c) =>
  new UserRepository(c.resolve('logger'))
);
container.register('userService', (c) =>
  new UserService(
    c.resolve('userRepository'),
    c.resolve('logger')
  )
);

const resolvedUserService = container.resolve('userService');
// inferred as UserService
```

Change the `userService` factory to return a Logger and TypeScript rejects the registration. Misspell `'userServce'` and TypeScript rejects the token. There is no explicit generic at the call site and no cast hiding a mismatch.

## Step 3: Scoped Lifetimes (The Part Frameworks Abstract Away)

Singleton means one instance for the root container. Transient means a new instance each time. But there's a third lifetime that many apps need: scoped - one instance per request or per unit of work.

This is where frameworks typically shine and where hand-rolled containers start to become more complex. In the implementation above, a scope shares registrations and singleton storage with the root, but owns a separate scoped cache:

```typescript
interface RequestContext {
  requestId: string;
}

interface AppServices {
  requestContext: RequestContext;
}

container.register(
  'requestContext',
  () => ({ requestId: crypto.randomUUID() }),
  'scoped'
);

// One scope per request in an Express route.
app.get('/users/:id', async (req, res, next) => {
  const scope = container.createScope();

  try {
    const context = scope.resolve('requestContext');
    const service = scope.resolve('userService');
    res.json({ requestId: context.requestId, user: await service.getUser(req.params.id) });
  } catch (error: unknown) {
    next(error);
  }
});
```

Notice what the container does not do: it never copies private registrations into an unrelated container, and a singleton factory always resolves from the root. That second rule prevents a singleton from capturing a scoped dependency created for whichever request happened to resolve it first. If a singleton asks for a scoped service, resolution fails instead of leaking request state across requests.

There is still a sharp edge: disposal. This small container does not know whether an object owns a database connection, whether cleanup is synchronous or asynchronous, or which transient instances should be tracked. Keep cleanup explicit with `try`/`finally` at the application boundary, or add a narrow scope-specific cleanup convention if your application genuinely needs one. Once you add automatic ownership graphs, disposal ordering, async hooks, child overrides, and diagnostics, you are building a framework. At that point, using a mature one is often the better decision.

## Step 4: Making Symbol Tokens Fully Type-Safe

String keys are readable, but symbols avoid accidental name collisions between modules. We can switch without changing the container. Declare each symbol as its own constant so TypeScript preserves its `unique symbol` type, then use those symbols as service-map keys:

```typescript
// tokens.ts
const LOGGER = Symbol('Logger');
const USER_REPOSITORY = Symbol('UserRepository');
const USER_SERVICE = Symbol('UserService');

export const TOKENS = {
  Logger: LOGGER,
  UserRepository: USER_REPOSITORY,
  UserService: USER_SERVICE,
} as const;

interface AppServices {
  [LOGGER]: ILogger;
  [USER_REPOSITORY]: IUserRepository;
  [USER_SERVICE]: UserService;
}

const symbolContainer = new Container<AppServices>();

symbolContainer.register(TOKENS.Logger, () => new Logger());
symbolContainer.register(TOKENS.UserRepository, (c) =>
  new UserRepository(c.resolve(TOKENS.Logger))
);
symbolContainer.register(TOKENS.UserService, (c) =>
  new UserService(
    c.resolve(TOKENS.UserRepository),
    c.resolve(TOKENS.Logger)
  )
);

const svc = symbolContainer.resolve(TOKENS.UserService);
// inferred as UserService
```

This is the useful part people often attribute to a phantom `Token<T>` class. The safety actually comes from preserving the token-to-service relationship all the way through `register` and `resolve`. A generic alias over plain `string | symbol` does not do that by itself because its type parameter has no structural role.

## When to Reach for a Framework Anyway

We are not arguing that frameworks are bad. We use NestJS in production. The point is that you should choose it with open eyes.

Reach for a framework when you need AOP concerns like logging, caching, or auth applied declaratively across methods via interceptors, your team is large and needs enforced conventions over architectural decisions, or you're building microservices and need the full ecosystem: Guards, Pipes, built-in OpenAPI, WebSockets, and more.

Stay framework-free when you're building a library (pulling in NestJS as a peer dependency is a non-starter), startup time and bundle size matter, or you want explicit tests without a framework test module. DI frameworks differ in when and how they instantiate providers, so benchmark your actual application rather than assuming every container is eager or slow.

## The Real Takeaway

The decorator-based DI you see in NestJS and InversifyJS isn't the correct way to do dependency injection in TypeScript. It's one way, optimized for ergonomics at the cost of some explicitness.

The pattern we built here - factory functions, typed keys, and a small container - is arguably more TypeScript-idiomatic. It uses the language's strengths (generics, indexed access types, inference, and structural typing) rather than runtime reflection.

It also has honest limits. Registration completeness, circular dependencies, lifetime violations, and disposal are runtime concerns unless you generate the whole graph ahead of time. A small container can guard the first three without pretending to be a framework; disposal is usually better left explicit.

Build it once from scratch. You'll never look at a framework's container the same way again.
