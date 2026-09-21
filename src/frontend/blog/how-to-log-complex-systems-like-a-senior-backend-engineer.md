---
seoTitle: How to Debug Production Errors in Node.js
slug: how-to-log-complex-systems-like-a-senior-backend-engineer
author: Rui Rocha
authorUrl: https://www.linkedin.com/in/ruirochawork/
authorType: Person
authorSameAs: https://www.linkedin.com/in/ruirochawork/
tag: Observability
tags: Observability, Backend, Architecture
title: How to Log Complex Systems Like a Senior Backend Engineer
subtitle: Correlate production errors with the work that caused them, without transforming your code into a mess.
intro: Correlate production errors with the work that caused them, without transforming your code into a mess.
date: August 23, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 10 min read
mediumUrl: https://medium.com/p/69d43f3adc36
---
### Request IDs, trace context, AsyncLocalStorage, and honest error handling (Express.js + TypeScript)

![How to Log Complex Systems Like a Senior Backend Engineer](/images/blog/how-to-log-complex-systems-like-a-senior-backend-engineer/how-to-log-complex-systems-like-a-senior-backend-engineer-header.webp)

Production bugs never happen in a quiet room. Ten users click at once, a background job runs, one query is slow, an external API throws an error, and your logs look like this:

```
User loaded
Order created
Database query failed
Payment failed
Request completed
```

You’re not missing logs. You’re missing the thread connecting them: which request caused which failure, for which user, in which order.

That thread is called request context, and this article shows how to build it without hiding what your code actually does.

## The Problem With Generic Logs

```typescript
app.post('/orders', async (req, res) => {
  console.log('Creating order');
  const order = await orderService.createOrder(req.body);
  console.log('Order created');
  res.json(order);
});
```

Two requests land at once:

```
Creating order
Creating order
Payment provider failed
Order created
Request completed
Request failed
```

Which request failed? Whose payment? Before or after the DB write? You can’t tell. The logs are individually true and collectively useless. This is what happens when logging doesn’t survive concurrency.

## The First Fix: a requestId on Every Line

Give every incoming request a unique ID, then stamp it on every log line produced while handling it:

```json
{
  "level": "error",
  "message": "Payment provider request failed",
  "requestId": "7d9f3a61-bc52-4f40-a595-00e77217db8c",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "method": "POST",
  "route": "/orders",
  "actorId": "user_42",
  "tenantId": "tenant_acme",
  "operation": "payment.charge",
  "durationMs": 842,
  "provider": "stripe",
  "errorType": "TimeoutError"
}
```

Now you can filter by request ID, trace ID, tenant, operation, provider, or error type. Your logs stop being a pile of events and become a timeline.

A request ID is useful inside one HTTP request. A W3C trace ID is the interoperable correlation key across HTTP calls, queues, and services. If OpenTelemetry already injects trace context and your logging pipeline supports log correlation, use that rather than inventing a second distributed tracing protocol.

## Don’t Pass requestId Through Every Function

You could thread it manually through every controller, service, and repository call. Don’t. That leaks an HTTP concern into code that shouldn’t know HTTP exists.

Instead, capture the context once at the boundary and let downstream code read it. Node’s stable tool for this is `AsyncLocalStorage`: request-scoped storage available to asynchronous work created inside its `run()` callback. Most native promises and callbacks preserve it. Some custom thenables, callback libraries, worker pools, and event-emitter integrations need `AsyncResource`, `bind()`, or `snapshot()` to avoid context loss.

```typescript
// logging/log-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestLogContext = {
  requestId: string;
  method: string;
  path: string;
  actorId?: string;
  tenantId?: string;
};

const storage = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestContext<T>(
  requestContext: RequestLogContext,
  callback: () => T
): T {
  return storage.run(requestContext, callback);
}

export function getRequestContext(): Readonly<RequestLogContext> | undefined {
  return storage.getStore();
}
```

This is the only file that knows how request context is stored. Everything else just asks for it.

## Define ILogger. Small and Boring

```typescript
export type LogContext = Record<string, unknown>;

export interface ILogger {
debug(message: string, context?: LogContext): void;
info(message: string, context?: LogContext): void;
warn(message: string, context?: LogContext): void;
error(message: string, context?: LogContext): void;
}
```

That’s it. `ILogger` writes records; it does not run business code or own control flow. A class that depends on `ILogger` is telling the truth about what it needs. Keep the interface compatible with the structured logger you actually deploy rather than building a second logging framework.

Domain interfaces stay just as clean. No Express Request/Response, no raw DB client, no SDK:

```typescript
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
}

export interface IPaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}
```

## A Context-Aware Logger Implementation

```typescript
// logging/console-logger.ts
import { trace } from '@opentelemetry/api';
import { getRequestContext } from './log-context';
import type { ILogger, LogContext } from './logger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class ConsoleLogger implements ILogger {
  debug(message: string, context: LogContext = {}) {
    this.write('debug', message, context);
  }

  info(message: string, context: LogContext = {}) {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}) {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}) {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, fields: LogContext) {
    const span = trace.getActiveSpan()?.spanContext();
    const entry = redact({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(getRequestContext() ?? {}),
      traceId: span?.traceId,
      spanId: span?.spanId,
      ...fields,
    });

    console.log(JSON.stringify(entry));
  }
}
```

Any class holding an `ILogger` now gets request and active span correlation automatically. There is still discipline required: field names need a schema, explicit fields can overwrite context fields in this small example, and production code needs buffering, backpressure, serializers, and failure behavior from a maintained structured-logging library.

## Redaction Is Not Optional

Do not log passwords, cookies, tokens, authorization headers, API keys, card data, full request/email bodies, or raw LLM prompts. Prefer allowlisting fields at each event. Central redaction is defense in depth, not proof that arbitrary objects are safe to log:

```typescript
const REDACTED = '[redacted]';
const SENSITIVE_KEY_PATTERN =
  /password|token|authorization|cookie|secret|api[_-]?key|card(number)?|emailBody|messages|prompt/i;

function redact(value: unknown, ancestors = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object') return value;
  if (ancestors.has(value)) return '[circular]';
  ancestors.add(value);

  if (value instanceof Error) {
    const result = {
      errorType: value.name,
    };
    ancestors.delete(value);
    return result;
  }

  if (Array.isArray(value)) {
    const result = value.map(item => redact(item, ancestors));
    ancestors.delete(value);
    return result;
  }

  const result = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(item, ancestors),
    ])
  );
  ancestors.delete(value);
  return result;
}
```

This example serializes only the error type. `Error.message`, `stack`, and nested causes can contain URLs, query values, credentials, payload fragments, or personal data, so do not copy them blindly into a general-purpose log. If stack traces are operationally necessary, sanitize them and send them to a more restricted diagnostic sink with an appropriate retention policy. A key-name pattern cannot detect a token hidden under `value` or decide whether an identifier is personal data. Use your logger's tested redaction and error serializers, classify the log schema, cap field sizes, and test representative nested payloads.

User, tenant, order, and IP identifiers may be personal or sensitive data. Log them only when the purpose, access controls, retention, and applicable law permit it; pseudonymize them when direct identity is unnecessary.

## Express Middleware: Create Context Once

```typescript
// http/request-context.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../logging/log-context';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const suppliedId = req.header('x-request-id');
  const requestId = suppliedId && SAFE_REQUEST_ID.test(suppliedId)
    ? suppliedId
    : randomUUID();

  res.setHeader('X-Request-ID', requestId);

  runWithRequestContext(
    {
      requestId,
      method: req.method,
      path: req.path,
    },
    next
  );
}
```

That response header matters: when a user reports a bug, the request ID from their browser's network tab can jump straight to matching logs. Treat incoming IDs as untrusted. Validate length and characters, and generate a replacement when they fail; otherwise a caller can create oversized fields or log-injection problems.

Do not accept `userId` or `tenantId` from an arbitrary header as authoritative context. Add identity after authentication from trusted claims, and use names such as `actorId` and `targetUserId` so the caller and affected resource cannot silently overwrite one another.

## Logging I/O Boundaries: Plain try/catch, No Magic

Most production bugs live in operations that cross a process boundary: DB queries, external API calls, queue publishes, and file I/O.

For important boundaries, you usually want the outcome, duration, dependency, operation, and failure classification. Traces are often the better signal for every start and end; logging every successful low-level call can be expensive and noisy. Log the boundary events that answer an operational question, and assign one layer ownership of each exception log so the same stack is not emitted four times.

```typescript
export class PostgresUserRepository implements IUserRepository {
  constructor(
    private readonly db: DatabaseClient,
    private readonly logger: ILogger
  ) {}

  async findById(id: string): Promise<User | null> {
    const startedAt = performance.now();

    // The target may differ from the authenticated actor in request context.
    const fields = {
      operation: 'users.findById',
      targetUserId: id,
    };

    try {
      const row = await this.db.oneOrNone(
        'select id, email, name from users where id = $1',
        [id]
      );
      const user = row ? mapUser(row) : null;

      this.logger.info('User lookup completed', {
        ...fields,
        found: Boolean(user),
        durationMs: Math.round(performance.now() - startedAt),
      });

      return user;
    } catch (error) {
      this.logger.error('User lookup failed', {
        ...fields,
        durationMs: Math.round(performance.now() - startedAt),
        error,
      });

      throw error;
    }
  }
}
```

The constructor’s two dependencies (`db`, `ILogger`) are the whole story, and reading the method top to bottom tells you what runs and what is logged. `performance.now()` is monotonic, so wall-clock corrections do not corrupt the duration.

The same pattern applies to a payment charge, queue publish, or third-party HTTP request when a log is justified. Re-throw when this layer cannot handle the failure; otherwise translate it into an explicit result or domain error. “Always re-throw” is not a useful rule at a boundary designed to recover, retry, or degrade gracefully.

One naming trap to watch for: if authenticated context contains `actorId` and a method logs another `actorId`, object spread silently keeps the last value. That is why the field above is `targetUserId`: the schema keeps the caller and affected resource distinct. Reserve correlation field names and reject or rename collisions in a production logger.

## Wire It Up Once, Inject Everywhere

```typescript
// composition-root.ts
const logger: ILogger = new ConsoleLogger();
const userRepository: IUserRepository = new PostgresUserRepository(db, logger);
const paymentProvider: IPaymentProvider = new StripePaymentProvider(stripeClient, logger);
const orderService: IOrderService = new OrderService(userRepository, paymentProvider, logger);
const orderController = new OrderController(orderService, logger);
```

`ILogger` is injected consistently. To switch providers, implement the interface with the new structured logger and replace `ConsoleLogger` at the composition root.

## Where Business Decisions Get Logged

Repositories and providers log infrastructure. Services log why a request was accepted or rejected:

```typescript
export class OrderService implements IOrderService {
  constructor(
    private readonly users: IUserRepository,
    private readonly payments: IPaymentProvider,
    private readonly logger: ILogger
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      this.logger.warn('Order creation rejected', {
        reason: 'user_not_found',
        targetUserId: input.userId,
      });
      throw new UserNotFoundError(input.userId);
    }

    const payment = await this.payments.charge({
      userId: user.id,
      amountCents: calculateTotal(input.items),
    });

    if (!payment.approved) {
      this.logger.info('Order creation rejected', {
        reason: 'payment_declined',
        targetUserId: user.id,
      });
      throw new PaymentDeclinedError();
    }

    this.logger.info('Order creation completed', {
      targetUserId: user.id,
      paymentId: payment.id,
    });

    return createOrderEntity(user, input.items, payment);
  }
}
```

This is the difference between logging errors and logging decisions. A provider timeout is an error; a valid card decline is normally an expected business outcome and can be `info`, not an operational warning. Severity should describe what operators need to do, not whether the HTTP response is successful.

## What the Logs Look Like, Filtered by One Request

```json
{"level":"info","message":"HTTP request started","requestId":"req_123","method":"POST","path":"/orders","userId":"user_42"}
{"level":"info","message":"Order creation started","requestId":"req_123","itemCount":3}
{"level":"info","message":"User lookup completed","requestId":"req_123","operation":"users.findById","found":true,"durationMs":18}
{"level":"info","message":"Payment provider request completed","requestId":"req_123","provider":"stripe","operation":"payment.charge","approved":false,"durationMs":842}
{"level":"info","message":"Order creation rejected","requestId":"req_123","reason":"payment_declined"}
{"level":"info","message":"HTTP request completed","requestId":"req_123","statusCode":402,"durationMs":911}
```

Filter by req_123 and the whole story reconstructs itself.

## Log the Rejected Branches, Not Just Exceptions

Don’t wait for a stack trace to explain an important branch. Log rejected decisions that matter for support, security, audit, or product operations, without turning every routine validation failure into an alert:

```typescript
if (!input.items.length) {
logger.warn('Order creation rejected', { reason: 'empty_cart' });
throw new Error('Cart is empty');
}
```

Candidates include authentication and authorization failures, rate limits, idempotency conflicts, provider declines, retries exhausted, and circuit breakers. Whether not-found and validation events belong in logs depends on volume and operational value; metrics are often better for aggregate rates.

## What Not to Log

This helps you debug:

```json
{ "message": "Payment charge failed", "provider": "stripe", "amountCents": 4200, "durationMs": 842, "statusCode": 500 }
```

This creates a security incident:

```json
{ "cardNumber": "4242424242424242", "authorization": "Bearer secret", "requestBody": { "everything": "..." } }
```

Even the first record needs review: transaction amounts and stable customer/order identifiers may be sensitive under your threat model or regulatory obligations. “Structured” does not mean “safe.”

## Optional: Add One Method to ILogger Later

Everything above is the recommended default. Explicit try/catch, nothing hidden. If your codebase grows to dozens of repositories and providers all repeating that same 12-line start/complete/fail shape, you can fold it into ILogger itself as one more method:

```typescript
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;

  operation<T>(
    name: string,
    context: LogContext,
    fn: () => Promise<T>,
    getResultContext?: (result: T) => LogContext
  ): Promise<T>;
}
```

```typescript
async findById(id: string): Promise<User | null> {
  return this.logger.operation(
    'User lookup',
    { operation: 'users.findById', targetUserId: id },
    async () => {
      const row = await this.db.oneOrNone(/* ... */);
      return row ? mapUser(row) : null;
    },
    user => ({ found: Boolean(user) })
  );
}
```

Be honest with yourself about the trade before reaching for this. It removes the copy-paste, but the call site no longer shows you where the try/catch sits or what gets logged when. You have to go read ConsoleLogger.operation() to know.

It can add abstraction frames and makes the method less self-explanatory to whoever opens the file next. Treat this as something to reach for once repetition has become painful, not as the default. In a traced system, a span helper may already solve timing and failure correlation without duplicating every operation in logs.

## Checklist

- Generate or accept a validated request ID at the HTTP boundary and return it in `X-Request-ID`.
- Store request context with `AsyncLocalStorage` and test any unusual async integrations.
- Merge request and trace context into structured records automatically.
- Inject `ILogger` through dependency injection.
- Log meaningful I/O outcomes and failures with monotonic durations; use traces for exhaustive start/end timing.
- Give one layer ownership of each exception log.
- Log important rejected business decisions with stable reason codes and appropriate severity.
- Prefer allowlisted fields, with central redaction as defense in depth.
- Reserve correlation field names and detect collisions.
- Do not log passwords, cookies, tokens, prompts, or full bodies.
- Correlate logs with W3C/OpenTelemetry trace and span IDs where available.
- Apply retention, access controls, size limits, and logging-failure tests.

## Final Thought

Logging isn’t about printing more text. It’s about making production behavior reconstructible by someone who wasn’t watching when it broke.

Add the context. Inject the logger. Log meaningful outcomes and decisions. Minimize sensitive data and redact defensively. Keep the code honest about what it does before you reach for anything clever.

Future you, staring at logs at 2am, will actually thank you.

## Sources

- [Node.js: AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
- [OpenTelemetry: Logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [W3C: Trace Context](https://www.w3.org/TR/trace-context/)
- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
