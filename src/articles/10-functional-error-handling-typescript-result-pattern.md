---
slug: functional-error-handling-typescript-result-pattern
tag: TypeScript · Architecture
title: Functional Error Handling in TypeScript with the Result Pattern
subtitle: Transform your error handling from chaotic exceptions to predictable, type-safe code.
date: September 26, 2025
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3
excerpt: Many developers default to throwing exceptions for error handling, but this approach has significant drawbacks that can make your codebase a nightmare to maintain. The Result pattern offers a better way.
---

![Functional Error Handling in Typescript](/images/articles/functional-error-handling-in-typescript/functional-error-handling-in-typescript-header.webp)

Many developers default to throwing exceptions for error handling, but this approach has significant drawbacks that can make your codebase a nightmare to maintain.

## The Problem with Exception-Based Error Handling

### Performance Impact - Exceptions Are Slow

Throwing exceptions is computationally expensive. When an exception is thrown, the JavaScript engine must create a stack trace, unwind the call stack, search for appropriate catch handlers, and clean up resources in the finally blocks. Exception throwing is roughly 1000x slower than a normal return, stack trace creation creates major CPU overhead, and the Result pattern carries nearly zero performance penalty.

### Hidden Control Flow

```typescript
// Bad: Hidden exceptions make control flow unpredictable
class UserService {
  async createUser(email: string): Promise<User> {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format"); // Hidden in method signature
    }
    
    if (await this.emailExists(email)) {
      throw new Error("Email already exists"); // Another hidden exception
    }
    
    return this.saveUser(new User(email));
  }
}

// Caller has no idea what exceptions to expect
try {
  const user = await userService.createUser("invalid-email");
} catch (error) {
  // Which specific error occurred?
  console.log(error.message); // Could be anything!
}
```

### Implicit Error Handling

The method signature Promise<User> doesn't tell us anything about potential failures. Callers must dig into implementation details or documentation to understand what can go wrong. It's like navigating a minefield!

### Inconsistent Error Handling

Different developers might throw different types of exceptions for similar scenarios. One dev throws ValidationError, another throws Error, and someone else throws a string. Good luck handling that mess!

### Testing Nightmare

Testing exception scenarios requires try/catch blocks in every test, making test code verbose and more complicated to maintain, since the code gets bloated pretty quickly.

```typescript
// Messy exception testing
it('should handle invalid email', async () => {
  try {
    await userService.createUser('invalid-email');
    fail('Should have thrown an error');
  } catch (error) {
    expect(error.message).toContain('Invalid email'); // Fragile string matching
  }
});
```

## The Result Pattern: A Better Way

The Result pattern is a functional programming approach that makes error handling explicit, predictable, and type-safe. Instead of throwing exceptions, methods return a Result<T> object that either contains a successful value or an error.

Think of it as a box that always has a label that tells you what's inside before you open it!

The Result pattern wraps your operation's outcome in a container that explicitly represents either success (contains the expected value) or failure (contains error information). This approach forces you to handle both cases explicitly, eliminating surprise exceptions and making your code more predictable.

### Result Class Implementation

Let's break down how our Result class works internally to understand why it's so powerful:

```typescript
export class Result<T> {
  // Private fields ensure immutability and controlled access
  private readonly success: boolean;
  private readonly value?: T;
  private readonly error?: Error;
  
  // Private constructor prevents direct instantiation
  // This forces users to use the static factory methods
  private constructor(success: boolean, value?: T, error?: Error) {
    this.success = success;
    this.value = value;
    this.error = error;
  }
  
  // Static factory method for success cases
  static success<T>(value?: T): Result<T> {
    return new Result<T>(true, value);
    // Notice: error is undefined in success cases
  }
  
  // Static factory method for error cases  
  static error<T>(error: Error): Result<T> {
    return new Result<T>(false, undefined, error);
    // Notice: value is undefined in error cases
  }
  
  // Type guard methods for checking state
  isSuccess(): boolean {
    return this.success;
  }
  
  isFailure(): boolean {
    return !this.isSuccess();
  }
  
  // Safe value extraction
  getValue(): T | undefined {
    return this.value;
  }
  
  // Safe error extraction
  getError(): Error | undefined {
    return this.error;
  }
}
```

### Why This Design Works

**Immutability by Design.** Once created, Result objects can't be modified:

```typescript
const result = Result.success("Hello");
result.success = false; // Compilation error!
```

**Type Safety.** TypeScript knows the generic type:

```typescript
const userResult: Result<User> = await getUser(id);
if (userResult.isSuccess()) {
  const user: User = userResult.getValue(); // Type-safe!
}
```

**Controlled Creation.** Only valid states are possible:

```typescript
// Can't create invalid states
new Result(true, undefined, someError); 
// Impossible due to private constructor

// Only valid states possible
const success = Result.success(data);
const failure = Result.error(someError);
```

**Memory Efficiency.** No stack trace creation overhead like exceptions — just simple object allocation:

```typescript
const result = Result.error(new InvalidMailException());
// vs
throw new Error("Invalid email"); // Creates expensive stack trace
```

## Defining Structured Application Errors

First, let's create a structured way to define errors that's both developer-friendly and machine-readable:

```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly description: string
  ) {
    super(description);
    this.name = 'AppError';
  }
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
    'Failed to save follower relationship'
  );
}
```

This approach gives us unique error codes for easy identification, human-readable descriptions for better UX, and centralized error definitions for consistency.

## Result Pattern In Action

Now let's see how to use the Result pattern in a service - notice how clearer it is:

```typescript
// Result pattern approach
class FollowerService {
  constructor(private followerRepository: IFollowerRepository) {}

  async startFollowing(user: User, followed: User): Promise<Result<void>> {
    // Explicit error handling - no hidden exceptions
    if (user.id === followed.id) {
      return Result.error(FollowerErrors.SAME_USER);
    }
    if (!followed.hasPublicProfile) {
      return Result.error(FollowerErrors.NON_PUBLIC_PROFILE);
    }
    const isAlreadyFollowing = await this.followerRepository
      .isAlreadyFollowing(user.id, followed.id);
      
    if (isAlreadyFollowing) {
      return Result.error(FollowerErrors.ALREADY_FOLLOWING);
    }
    try {
      await this.followerRepository.addFollower(user.id, followed.id);
      return Result.success(); // Success
    } catch (error) {
      // Only use exceptions for truly unexpected errors
      return Result.error(FollowerErrors.DATABASE_ERROR);
    }
  }
}

// Repository methods can also use Result pattern
class FollowerRepository implements IFollowerRepository {
  async getUserById(id: string): Promise<Result<User>> {
    const user = await this.database.findUser(id);
    
    if (!user) {
      return Result.error(FollowerErrors.USER_NOT_FOUND);
    }
    
    return Result.success(user);
  }

  async isAlreadyFollowing(userId: string, followedId: string): Promise<boolean> {
    // Simple boolean return - no error cases expected
    return await this.database.checkFollowingRelation(userId, followedId);
  }

  async addFollower(userId: string, followedId: string): Promise<void> {
    await this.database.insertFollower({ userId, followedId });
  }
}
```

Benefits of this approach: clear method signatures that indicate possible failures, explicit error handling for each scenario, structured and identifiable errors, and type-safe error handling.

## Testing with Result Pattern

Testing becomes much more straightforward and reliable:

```typescript
// Clean, explicit testing
describe('FollowerService', () => {
  let followerService: FollowerService;
  let mockRepository: jest.Mocked<IFollowerRepository>;

  beforeEach(() => {
    mockRepository = {
      isAlreadyFollowing: jest.fn(),
      addFollower: jest.fn()
    };
    followerService = new FollowerService(mockRepository);
  });

  it('should return error when user tries to follow themselves', async () => {
    const user: User = { id: '1', email: 'test@test.com', hasPublicProfile: true };
    
    const result = await followerService.startFollowing(user, user);
    
    expect(result.isFailure()).toBe(true);
    expect(result.getError()).toBe(FollowerErrors.SAME_USER);
    // Exact error matching - no fragile string comparisons!
  });

  it('should return error when trying to follow non-public profile', async () => {
    const user: User = { id: '1', email: 'user@test.com', hasPublicProfile: true };
    const privateUser: User = { id: '2', email: 'private@test.com', hasPublicProfile: false };
    
    const result = await followerService.startFollowing(user, privateUser);
    
    expect(result.isFailure()).toBe(true);
    expect(result.getError()).toBe(FollowerErrors.NON_PUBLIC_PROFILE);
  });

  it('should return success when following is valid', async () => {
    const user: User = { id: '1', email: 'user@test.com', hasPublicProfile: true };
    const followed: User = { id: '2', email: 'followed@test.com', hasPublicProfile: true };
    
    mockRepository.isAlreadyFollowing.mockResolvedValue(false);
    
    const result = await followerService.startFollowing(user, followed);
    
    expect(result.isSuccess()).toBe(true);
    expect(mockRepository.addFollower).toHaveBeenCalledWith('1', '2');
  });
});
```

Testing benefits: precise error checking with no more string matching, cleaner test code with no try/catch blocks needed, better test coverage since all error paths are easy to test, and faster tests with no exception overhead.

## When to Still Use Exceptions

Reserve exceptions only for truly exceptional situations:

```typescript
// Appropriate use of exceptions
class DatabaseService {
  async connect(): Promise<void> {
    try {
      await this.database.connect();
    } catch (error) {
      // System failure - appropriate to throw
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }
}

class ConfigurationService {
  loadConfig(): Config {
    if (!process.env.DATABASE_URL) {
      // Programming error - should never happen in production
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    return new Config(process.env.DATABASE_URL);
  }
}
```

Use exceptions for system failures (out of memory, network timeouts), programming errors (null reference, invalid configuration), external library failures you can't predict, and violations of preconditions or invariants.

## Summary

The Result pattern transforms error handling from implicit and unpredictable to explicit and manageable. By making failures part of your method signatures, you create more reliable, testable, and maintainable TypeScript applications.

Key takeaways: use the Result pattern for expected failures and business logic errors, reserve exceptions for truly exceptional unexpected situations, make error handling explicit in your method signatures, enjoy cleaner more predictable code that's easier to test and maintain, structure your errors with codes and descriptions for better debugging, and chain operations cleanly without nested try/catch blocks.

The small upfront cost of checking Result states pays massive dividends in code clarity, reliability, and developer confidence. Your future self (and your teammates) will thank you!

Tips for getting started: convert one service at a time to the Result pattern, create error catalogs to document all your application errors in one place, use TypeScript strict mode to catch potential undefined errors at compile time, and educate your team to make sure everyone understands the pattern.

Ready to make your TypeScript code more robust and maintainable? Give the Result pattern a try - you'll never want to go back to exception-driven development!
