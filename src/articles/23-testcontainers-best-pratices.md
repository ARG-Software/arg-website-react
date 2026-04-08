---
slug: testcontainers-best-practices-nestjs
tag: NestJS · Testing
title: Testcontainers Best Practices for NestJS Integration Testing
subtitle: Integration tests with Testcontainers are powerful - but they can quickly become a maintenance nightmare if you don't follow the right patterns.
date: March 10, 2026
readTime: 9 min read
mediumUrl: https://arg-software.medium.com/testcontainers-best-practices-for-nestjs-integration-testing
excerpt: Integration tests with Testcontainers are powerful - but they can quickly become a maintenance nightmare if you don't follow the right patterns. We've seen teams struggle with flaky tests, slow test suites, and configuration headaches that could have been avoided with better practices from the start.
---

![Testcontainers Best Practices for NestJS Integration Testing](/images/articles/testcontainers-best-practices-nestjs/testcontainers-best-practices-nestjs-header.webp)

Integration tests with Testcontainers are powerful - but they can quickly become a maintenance nightmare if you don't follow the right patterns. We've seen teams struggle with flaky tests, slow test suites, and configuration headaches that could have been avoided with better practices from the start. Today, we'll show you the patterns that make Testcontainers tests in NestJS reliable, fast, and easy to maintain.

## Unit Tests vs Integration Tests - What's the Difference?

Before diving in, let's get the definitions straight. These two types of tests serve very different purposes, and confusing them leads to test suites that give you false confidence.

🔬 Unit Tests

A unit test verifies a single piece of logic in complete isolation. Dependencies - databases, HTTP clients, external services - are replaced with mocks or stubs.

```typescript
// Unit test - OrderService is tested in isolation
describe('OrderService', () => {
  it('should throw when stock is insufficient', async () => {
    const mockRepo = { findById: jest.fn().mockResolvedValue({ stock: 2 }) };
    const service = new OrderService(mockRepo as any);
    await expect(service.placeOrder({ productId: '1', quantity: 5 }))
      .rejects.toThrow('Insufficient stock');
  });
});
```

✅ Pros: Extremely fast. No infrastructure needed. Easy to write and run anywhere.

❌ Cons: You're testing against a fake world. Your mock might not behave like real Postgres. Edge cases in SQL queries, transactions, or Redis TTLs will go completely undetected.

🔗 Integration Tests

An integration test verifies that multiple parts of your system work correctly together - your service, your database, your cache, your HTTP layer. No mocks for infrastructure. Real connections, real queries, real behavior.

```typescript
// Integration test - the full stack is exercised
describe('POST /orders', () => {
  it('should return 400 when stock is insufficient', async () => {
    const product = await createTestProduct({ stock: 2 });
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ productId: product.id, quantity: 5 });
    expect(response.status).toBe(400);
  });
});
```

✅ Pros: Tests what actually runs in production. Catches bugs that unit tests miss - constraint violations, migration issues, cache invalidation bugs.

❌ Cons: Slower to run. Requires infrastructure (Docker). More complex setup.

![Testcontainers Best Practices for NestJS Integration Testing](/images/articles/testcontainers-best-practices-nestjs/testcontainers-best-practices-nestjs-unit-vs-integration.webp)

## Which Gives You More Confidence When Changing Code?

This is the real question. And the honest answer: it depends on what you're changing.

Unit tests are fast feedback loops for logic. Integration tests are your safety net when the real system changes. You need both - but if you're asking which one saves you from production incidents, integration tests win by a wide margin.

> 💡 A passing unit test suite gives you confidence your logic is correct. A passing integration test suite gives you confidence your system actually works.

The classic failure mode: a developer refactors a repository method, all unit tests pass (because they mock the repo), and then production breaks because the new SQL has a subtle bug. An integration test would have caught it immediately.

## How Testcontainers Changes Integration Testing

Traditional integration tests often rely on shared test databases or in-memory alternatives that don't match production behavior. You either deal with test pollution between runs or sacrifice realism for speed.

Testcontainers solves this by spinning up real Docker containers for your dependencies. Your tests run against actual PostgreSQL, Redis, or any other service you use in production. When tests are complete, containers are destroyed - giving you a clean slate every time.

The magic happens through Docker's API. Testcontainers manages the entire lifecycle: pulling images, starting containers, waiting for readiness, and cleanup. Your test code just needs to know how to connect.

## Prerequisites

Install the required packages:

```bash
npm install --save-dev @testcontainers/postgresql @testcontainers/redis
npm install --save-dev @nestjs/testing supertest
```

🐳 Make sure Docker is running locally. Testcontainers uses it under the hood.

## Creating Test Containers

Here's how to set up your containers with proper configuration:

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

const postgresContainer = await new PostgreSqlContainer('postgres:17')
  .withDatabase('myapp')
  .withUsername('postgres')
  .withPassword('postgres')
  .start();
const redisContainer = await new RedisContainer('redis:7').start();
```

To start and stop containers cleanly across your test suite, use Jest's globalSetup / globalTeardown, or manage them inside beforeAll / afterAll blocks in a shared setup file:

```typescript
// test/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer('postgres:17')
    .withDatabase('myapp')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  redisContainer = await new RedisContainer('redis:7').start();
});

afterAll(async () => {
  await postgresContainer.stop();
  await redisContainer.stop();
});
```

This ensures containers are ready before tests run and properly cleaned up afterward - no leftover Docker state, no race conditions.

> ⚠️ Tip: Always pin your image versions (like postgres:17) to avoid surprises from upstream changes. I learned this the hard way when a patch update caused my tests to fail unexpectedly.

## Pass Configuration to Your NestJS App Dynamically

The biggest mistake we see is hardcoding connection strings. Testcontainers assigns dynamic ports - you can't know them ahead of time.

Instead, override your NestJS module configuration using Test.createTestingModule and replace environment values at runtime:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

let app: INestApplication;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('DATA_SOURCE_OPTIONS')
    .useValue({
      type: 'postgres',
      url: postgresContainer.getConnectionUri(),
      // ...entities, migrations, etc.
    })
    .compile();
  app = moduleFixture.createNestApplication();
  await app.init();
});
```

Or, if you're using ConfigService or environment variables directly, set them before the module compiles:

```typescript
process.env.DATABASE_URL = postgresContainer.getConnectionUri();
process.env.REDIS_URL = redisContainer.getConnectionUrl();
```

The key is to never hardcode ports. Let Testcontainers tell you where things are, then pass that forward.

## Share Expensive Setup with a Base Test Class

Spinning up containers is expensive. Starting one per test file defeats the purpose. The right move is to share them across your suite.

Create a shared IntegrationTestSetup class that wraps the app factory and exposes helpers:

```typescript
// test/integration-test.setup.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

export class IntegrationTestSetup {
  app: INestApplication;

  async init(databaseUrl: string, redisUrl: string) {
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    this.app = moduleFixture.createNestApplication();
    await this.app.init();
  }

  async close() {
    await this.app.close();
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }
}
```

Then in your jest.config.ts, configure a global setup file to start containers once and share them:

```typescript
// jest.config.ts
export default {
  globalSetup: './test/global-setup.ts',
  globalTeardown: './test/global-teardown.ts',
  setupFilesAfterFramework: ['./test/setup.ts'],
};
```

```typescript
// test/global-setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

export default async () => {
  const postgres = await new PostgreSqlContainer('postgres:17')
    .withDatabase('myapp')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  const redis = await new RedisContainer('redis:7').start();

  // Share via global so teardown can stop them
  (global as any).__POSTGRES__ = postgres;
  (global as any).__REDIS__ = redis;
  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();
};
```

```typescript
// test/global-teardown.ts
export default async () => {
  await (global as any).__POSTGRES__?.stop();
  await (global as any).__REDIS__?.stop();
};
```

⚖️ When to isolate per test file vs share globally:

- 🌍 Global containers - when test files don't modify shared state or when you clean up after each test. Faster, requires discipline.
- 📁 Per-file containers - when tests modify global state or when debugging interactions becomes difficult. Slower but safer.

## Utility Methods for Auth and Cleanup

Your setup class should expose helpers to keep test files focused on business logic:

```typescript
export class IntegrationTestSetup {
  // ... previous code

  async createAuthenticatedRequest(userId: string) {
    const token = await this.generateTestToken(userId);
    return request(this.getHttpServer()).set('Authorization', `Bearer ${token}`);
  }

  async cleanDatabase() {
    const dataSource = this.app.get(DataSource);
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repo = dataSource.getRepository(entity.name);
      await repo.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE`);
    }
  }

  private async generateTestToken(userId: string): Promise<string> {
    const jwtService = this.app.get(JwtService);
    return jwtService.sign({ sub: userId });
  }
}
```

Call cleanDatabase() in afterEach if you're sharing containers across tests:

```typescript
afterEach(async () => {
  await setup.cleanDatabase();
});
```

🚨 This is your safety net. Without it, tests will bleed state into each other, and you'll spend hours chasing phantom failures.

## Writing Maintainable Integration Tests

With the infrastructure properly configured, your actual tests should focus on business logic, not plumbing:

```typescript
describe('POST /orders', () => {
  it('should return 400 when stock is insufficient', async () => {
    // Arrange
    const product = await createTestProduct({ stock: 2 });
    const user = await createTestUser();
    // Act
    const response = await setup
      .createAuthenticatedRequest(user.id)
      .post('/orders')
      .send({ productId: product.id, quantity: 5 });
    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Insufficient stock');
  });
});
```

Notice how the test doesn't mention containers, connections, or infrastructure at all. The complexity is hidden behind well-designed helpers. You're not mocking Postgres or Redis - you're testing real behavior.

## Conclusion

Testcontainers transforms integration testing by giving you the confidence that comes from testing against real dependencies. No more wondering if your in-memory SQLite behavior matches production Postgres, or dealing with shared test environments that break when someone runs tests in parallel.

Unit tests are still valuable - they're fast, focused, and great for pure logic. But integration tests are what give you real confidence when the system changes. They're the difference between "the tests pass" and "the system works."

Start simple: pick one integration test that currently uses mocks or in-memory databases, and convert it to use Testcontainers. You'll immediately notice the difference in confidence when that test passes. Then gradually expand to cover your critical business flows. The investment in setup pays back fast, trust us.