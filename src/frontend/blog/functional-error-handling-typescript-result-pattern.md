---
seoTitle: TypeScript Error Handling: Result Pattern
slug: functional-error-handling-typescript-result-pattern
tag: Architecture
tags: Architecture, Backend
title: Functional Error Handling in TypeScript with the Result Pattern
subtitle: Learn the Result pattern for explicit, type-safe error handling without treating every failure as an exception.
intro: Learn the Result pattern for explicit, type-safe error handling without treating every failure as an exception.
date: September 26, 2025
dateModified: September 17, 2026
reviewedOn: September 17, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3
---

![Functional Error Handling in Typescript](/images/blog/functional-error-handling-in-typescript/functional-error-handling-in-typescript-header.webp)

Many developers default to throwing exceptions for every failure, but this approach has drawbacks that can make a codebase harder to maintain. Exceptions are useful. The problem is using them where a failure is expected and the caller needs to make a decision about it.

## The Problem with Exception-Based Error Handling

### Performance Is Context-Dependent

Throwing an exception transfers control to the nearest enclosing `catch`, unwinding through intervening calls. Engines may also capture stack information for `Error` objects. That is more work than a normal return, but there is no honest universal multiplier: JavaScript engines, stack settings, hot paths, and allocation patterns differ. A Result allocates too. Choose it for explicit control flow and measure your real workload if performance matters.

### Hidden Control Flow

```typescript
// Hidden exceptions make the expected failure modes unclear.
class UserService {
  async createUser(email: string): Promise<User> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (await this.emailExists(email)) {
      throw new Error('Email already exists');
    }

    return this.saveUser(new User(email));
  }
}

try {
  const user = await userService.createUser('invalid-email');
  console.log(user);
} catch (error: unknown) {
  // JavaScript can throw any value, so narrow before reading Error properties.
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    throw error;
  }
}
```

### Implicit Error Handling

The method signature `Promise<User>` doesn't tell us whether invalid input, a duplicate email, and a database outage are all thrown. Callers must read implementation details or documentation to understand what can go wrong.

### Inconsistent Error Handling

Different developers might throw different types for similar scenarios. One dev throws `ValidationError`, another throws `Error`, and JavaScript even permits throwing a string. TypeScript's [`useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) option exists for exactly this reason: a caught value must be narrowed before you assume it is an `Error`.

### Testing Expected Failures

Modern test frameworks can assert rejected promises directly, so exceptions do not require a manual `try`/`catch` in every test. The more important problem is that tests often end up coupled to an exception class or message that the function signature never promised:

```typescript
await expect(userService.createUser('invalid-email'))
  .rejects.toThrow('Invalid email');
```

That test is concise, but the expected failure remains implicit in the production API.

## The Result Pattern: A Better Way

The Result pattern is a functional programming approach that makes expected failure explicit, predictable, and type-safe. Instead of throwing for a normal business outcome, a method returns a `Result<T, E>` that contains either a successful value or a known error.

Think of it as a box with a label that tells you what's inside before you open it.

The label must do real type-system work. A boolean beside two optional fields still allows awkward states and returns `T | undefined` even after a success check. A discriminated union models success and failure as separate members and lets TypeScript narrow the value using ordinary control flow, as documented in the official [TypeScript narrowing guide](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions).

### Result Implementation

```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function failure<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### Why This Design Works

**Compile-Time Immutability.** The fields can't be reassigned through TypeScript. This does not freeze the object at runtime:

```typescript
const result = success('Hello');
result.ok = false; // Compilation error: ok is readonly.
```

**Type-Safe Access.** Checking the discriminant exposes exactly one payload:

```typescript
const userResult: Result<User, AppError> = await getUser(id);

if (userResult.ok) {
  const user: User = userResult.value;
  console.log(user.email);
} else {
  console.log(userResult.error.code);
}
```

Trying to read `userResult.value` in the failure branch is a compilation error. There is no `undefined` fallback pretending to be safe.

**Distinct States.** Each union member has one discriminant and one payload:

```typescript
const saved = success(data);
const rejected = failure(someError);

// Ordinary object-literal checks reject a mismatched payload.
```

**Small Runtime Shape.** A Result is a plain object. It still allocates, and an error payload may itself be an `Error`, so do not claim that it is free. Its advantage is that expected control flow remains visible in the return type.

## Defining Structured Application Errors

First, let's create a structured way to define expected errors that's both developer-friendly and machine-readable. These are values, not thrown exceptions, so they do not need to extend `Error`:

```typescript
export class AppError {
  constructor(
    public readonly code: string,
    public readonly description: string
  ) {}
}

export class FollowerErrors {
  static readonly SAME_USER = new AppError(
    'FOLLOWERS_SAME_USER',
    'Cannot follow yourself'
  );

  static readonly NON_PUBLIC_PROFILE = new AppError(
    'FOLLOWERS_NON_PUBLIC_PROFILE',
    'Cannot follow non-public profiles'
  );

  static readonly ALREADY_FOLLOWING = new AppError(
    'FOLLOWERS_ALREADY_FOLLOWING',
    'Already following this user'
  );

  static readonly USER_NOT_FOUND = new AppError(
    'FOLLOWERS_USER_NOT_FOUND',
    'User not found'
  );

  static readonly DATABASE_ERROR = new AppError(
    'FOLLOWERS_DATABASE_ERROR',
    'Failed to access follower relationships'
  );
}
```

This gives us unique error codes for identification, human-readable descriptions for the UI, and centralized definitions for consistency.

## Result Pattern In Action

Now let's see how to use the Result pattern in a service - notice how the expected branches appear in the code and the signature:

```typescript
interface IFollowerRepository {
  getUserById(id: string): Promise<Result<User, AppError>>;
  isAlreadyFollowing(
    userId: string,
    followedId: string
  ): Promise<Result<boolean, AppError>>;
  addFollower(
    userId: string,
    followedId: string
  ): Promise<Result<void, AppError>>;
}

class FollowerService {
  constructor(private followerRepository: IFollowerRepository) {}

  async startFollowing(
    user: User,
    followed: User
  ): Promise<Result<void, AppError>> {
    if (user.id === followed.id) {
      return failure(FollowerErrors.SAME_USER);
    }
    if (!followed.hasPublicProfile) {
      return failure(FollowerErrors.NON_PUBLIC_PROFILE);
    }

    const existing = await this.followerRepository.isAlreadyFollowing(
      user.id,
      followed.id
    );
    if (!existing.ok) {
      return existing;
    }
    if (existing.value) {
      return failure(FollowerErrors.ALREADY_FOLLOWING);
    }

    return this.followerRepository.addFollower(user.id, followed.id);
  }
}
```

The repository is the right boundary for translating a known infrastructure failure into an application result. It should not swallow every thrown value, because a `TypeError` caused by a programming bug is not a database outcome:

```typescript
class FollowerRepository implements IFollowerRepository {
  constructor(private database: DatabaseClient) {}

  async getUserById(id: string): Promise<Result<User, AppError>> {
    try {
      const user = await this.database.findUser(id);
      return user
        ? success(user)
        : failure(FollowerErrors.USER_NOT_FOUND);
    } catch (error: unknown) {
      return this.handleDatabaseError(error);
    }
  }

  async isAlreadyFollowing(
    userId: string,
    followedId: string
  ): Promise<Result<boolean, AppError>> {
    try {
      const exists = await this.database.checkFollowingRelation(
        userId,
        followedId
      );
      return success(exists);
    } catch (error: unknown) {
      return this.handleDatabaseError(error);
    }
  }

  async addFollower(
    userId: string,
    followedId: string
  ): Promise<Result<void, AppError>> {
    try {
      await this.database.insertFollower({ userId, followedId });
      return success(undefined);
    } catch (error: unknown) {
      return this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError<T>(error: unknown): Result<T, AppError> {
    if (error instanceof DatabaseError) {
      return failure(FollowerErrors.DATABASE_ERROR);
    }
    throw error;
  }
}
```

Here, `DatabaseError` represents the database client's documented operational error type. Known database failures become a stable application error. Unknown values are rethrown unchanged rather than being mislabeled and hidden.

Benefits of this approach: method signatures indicate expected failures, every business branch is explicit, errors are structured and identifiable, and success or failure payloads are type-safe.

## Testing with Result Pattern

Testing expected outcomes becomes straightforward and precise:

```typescript
describe('FollowerService', () => {
  let followerService: FollowerService;
  let mockRepository: jest.Mocked<IFollowerRepository>;

  beforeEach(() => {
    mockRepository = {
      getUserById: jest.fn(),
      isAlreadyFollowing: jest.fn(),
      addFollower: jest.fn(),
    };
    followerService = new FollowerService(mockRepository);
  });

  it('returns an error when a user follows themselves', async () => {
    const user: User = {
      id: '1',
      email: 'test@test.com',
      hasPublicProfile: true,
    };

    const result = await followerService.startFollowing(user, user);

    if (result.ok) {
      throw new Error('Expected startFollowing to fail');
    }
    expect(result.error).toBe(FollowerErrors.SAME_USER);
  });

  it('returns an error for a non-public profile', async () => {
    const user: User = {
      id: '1',
      email: 'user@test.com',
      hasPublicProfile: true,
    };
    const privateUser: User = {
      id: '2',
      email: 'private@test.com',
      hasPublicProfile: false,
    };

    const result = await followerService.startFollowing(user, privateUser);

    if (result.ok) {
      throw new Error('Expected startFollowing to fail');
    }
    expect(result.error).toBe(FollowerErrors.NON_PUBLIC_PROFILE);
  });

  it('returns success when following is valid', async () => {
    const user: User = {
      id: '1',
      email: 'user@test.com',
      hasPublicProfile: true,
    };
    const followed: User = {
      id: '2',
      email: 'followed@test.com',
      hasPublicProfile: true,
    };

    mockRepository.isAlreadyFollowing.mockResolvedValue(success(false));
    mockRepository.addFollower.mockResolvedValue(success(undefined));

    const result = await followerService.startFollowing(user, followed);

    expect(result.ok).toBe(true);
    expect(mockRepository.addFollower).toHaveBeenCalledWith('1', '2');
  });
});
```

The explicit `if` statements in the failure tests are not ceremony. They narrow the discriminated union before the test reads `error`, so the test itself obeys the same type-safe access rules as production code.

## When to Still Use Exceptions

Exceptions and Results solve different problems. Use a Result when failure is an expected part of the operation and the immediate caller can reasonably recover, branch, retry, or show a message. Use an exception when execution cannot sensibly continue at that layer, for programmer errors and broken invariants, or when an API already communicates failure by throwing.

Do not catch an exception merely to relabel every possible value. Catch at a boundary where you can add context, translate a documented failure, retry, or clean up. Otherwise, let it propagate to a centralized handler. MDN's [`try...catch` reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) also notes that `finally` runs before control leaves the construct, which makes it the right place for cleanup that must happen on both returns and throws.

```typescript
class DatabaseService {
  async connect(): Promise<void> {
    try {
      await this.database.connect();
    } catch (error: unknown) {
      throw new Error('Failed to connect to database', { cause: error });
    }
  }
}

class ConfigurationService {
  loadConfig(): Config {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    return new Config(databaseUrl);
  }
}
```

The first example adds startup context while preserving the original value as `cause`. The second stops startup because the application cannot satisfy a required invariant. A network timeout is not automatically “exceptional”: in a request workflow it may be an expected retryable Result, while during mandatory startup it may prevent the process from continuing. The right choice depends on who can handle the failure.

Some failures, such as exhausted memory or process termination, are not useful candidates for ordinary application recovery at all. Do not promise that an exception policy can safely handle them.

## Summary

The Result pattern transforms expected failures from implicit control flow into explicit data. By making those failures part of method signatures, you can create more predictable and maintainable TypeScript applications without pretending exceptions have no place.

Key takeaways: use a Result for expected failures and business outcomes, use a discriminated union so TypeScript can narrow access safely, catch `unknown` and translate only failures you understand, preserve unexpected exceptions, keep cleanup in `finally` where appropriate, and benchmark before making performance claims.

The small upfront cost of checking a Result state often pays dividends in clarity and developer confidence. It is not a mandate to replace every throw.

Tips for getting started: convert one service boundary at a time, create small error catalogs for stable application errors, enable TypeScript strict mode, and agree as a team on which failures are expected values versus exceptions.

Ready to make your expected failure paths more explicit? Give the Result pattern a try - then keep exceptions for the jobs they do well.
