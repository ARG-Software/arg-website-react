---
seoTitle: How to Debug Production Errors in Node.js
slug: how-to-log-complex-systems-like-a-senior-backend-engineer
tag: Observability
tags: Observability, Backend, Architecture
title: How to Log Complex Systems Like a Senior Backend Engineer
subtitle: Trace every bug back to the request that caused it, without transforming your code into a mess.
intro: Trace every bug back to the request that caused it, without transforming your code into a mess.
date: August 23, 2026
dateModified: September 1, 2026
readTime: 10 min read
mediumUrl: https://medium.com/p/69d43f3adc36
---
### Request IDs, AsyncLocalStorage, and honest try/catch — no magic, no hidden wrappers (Express.js + TypeScript)

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

## 😵💫 The Problem With Generic Logs

```
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

## 🧵 The Fix: a requestId on Every Line

Give every incoming request a unique ID, then stamp it on every log line produced while handling it:

```
{
"level": "error",
"message": "Payment provider charge failed",
"requestId": "req_01JZ8Q3V5Z4V3ZPHK6",
"method": "POST",
"path": "/orders",
"userId": "user_42",
"tenantId": "tenant_acme",
"operation": "payment.charge",
"durationMs": 842,
"provider": "stripe",
"statusCode": 402
}
```

Now you can filter by requestId, userId, tenantId, operation, provider, statusCode. Your logs stop being a pile of events and become a timeline.

## 🙅 Don’t Pass requestId Through Every Function

You could thread it manually through every controller, service, and repository call. Don’t. That leaks an HTTP concern into code that shouldn’t know HTTP exists.

Instead, capture the context once at the boundary and let anything downstream read it automatically. Node’s tool for this is AsyncLocalStorage. Request-scoped storage that any async code spawned inside that request can read without it being passed by hand.

```
// logging/log-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestLogContext = {
requestId: string;
method: string;
path: string;
userId?: string;
tenantId?: string;
};
const storage = new AsyncLocalStorage();
export function runWithRequestContext(
context: RequestLogContext,
callback: () => T
): T {
return storage.run(context, callback);
}
export function getRequestContext(): Partial {
return storage.getStore() ?? {};
}
```

This is the only file that knows how request context is stored. Everything else just asks for it.

## 📐 Define ILogger. Small and Boring

```
export type LogContext = Record;

export interface ILogger {
debug(message: string, context?: LogContext): void;
info(message: string, context?: LogContext): void;
warn(message: string, context?: LogContext): void;
error(message: string, context?: LogContext): void;
}
```

That’s it. ILogger's only job is writing lines. It doesn't run your code or manage control flow. A class that depends on ILogger is telling the truth about what it needs: something to call .info()/.error() on, nothing more. That's what keeps it trivial to tests.

Domain interfaces stay just as clean. No Express Request/Response, no raw DB client, no SDK:

```
export interface IUserRepository {
findById(id: string): Promise;
}

export interface IPaymentProvider {
charge(input: ChargeInput): Promise;
}
```

## 🤖 A Context-Aware Logger Implementation

```
// logging/console-logger.ts
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
private write(level: LogLevel, message: string, context: LogContext) {
const entry = redact({
timestamp: new Date().toISOString(),
level,
message,
...getRequestContext(),
...context,
});
console.log(JSON.stringify(entry));
}
}
```

Any class holding a ILogger now produces contextual logs automatically. No requestId argument, no discipline required.

## 🔐 Redaction Is Not Optional

Never log passwords, cookies, tokens, Authorization headers, API keys, card data, full request/email bodies, or raw LLM prompts. Redact centrally, once:

```
const REDACTED = '[redacted]';
const SENSITIVE_KEY_PATTERN = /password|token|authorization|cookie|secret|apiKey|card|emailBody|messages|prompt/i;

function redact(value: unknown): unknown {
if (Array.isArray(value)) return value.map(redact);
if (!value || typeof value !== 'object') return value;
return Object.fromEntries(
Object.entries(value).map(([key, item]) => [
key,
SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(item),
])
);
}
```

The goal isn’t logging everything. It’s logging enough to reconstruct what happened safely.

## 🚦 Express Middleware: Create Context Once

```
// http/request-context.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../logging/log-context';

export function requestContextMiddleware(
req: Request,
res: Response,
next: NextFunction
) {
const requestId = req.header('x-request-id') ?? randomUUID();
res.setHeader('X-Request-ID', requestId);
runWithRequestContext(
{
requestId,
method: req.method,
path: req.path,
userId: req.user?.id,
tenantId: req.header('x-tenant-id'),
},
next
);
}
```

That header matters: when a user reports a bug, grab the X-Request-ID from their browser's network tab and jump straight to the matching logs.

## ⏳ Logging I/O Boundaries: Plain try/catch, No Magic

Most production bugs live in operations that cross a process boundary: DB queries, external API calls, queue publishes, and file I/O.

For each one, you want to know when it started, how long it took, and why it failed. The clearest way to get that is to just write it:

```
export class PostgresUserRepository implements IUserRepository {
constructor(
private readonly db: DatabaseClient,
private readonly logger: ILogger)
{

async findById(id: string): Promise {
const startedAt = Date.now();

// targetUserId, not userId - `id` is the user being looked up, which may
// not be the same person as the authenticated caller already in context

this.logger.info('User lookup started', { operation: 'users.findById',
targetUserId: id });

try {
const row = await this.db.oneOrNone(
'select id, email, name from users where id = $1',
[id]
);
const user = row ? mapUser(row) : null;
this.logger.info('User lookup completed', {
operation: 'users.findById',
targetUserId: id,
found: Boolean(user),
durationMs: Date.now() - startedAt,
});
return user;
} catch (error) {
this.logger.error('User lookup failed', {
operation: 'users.findById',
targetUserId: id,
durationMs: Date.now() - startedAt,
error, // error.stack is already in there - a plain try/catch loses nothing
});
throw error;
}
}
}
}
```

The constructor’s two dependencies (db, ILogger) are the whole story, and reading the method top to bottom tells you exactly what runs and what gets logged when.

The same pattern applies to any external call. A payment charge, a queue publish, or an HTTP request to a third-party API: log started, do the work in try, log completed or failed, and always re-throw.

One naming trap to watch for: the middleware puts the authenticated caller’s userId into the request context automatically. If a method also logs a userId that means something else - like the id above, the user being looked up, not the one making the request. Object spread means whichever one is merged in last silently wins, and you lose the other. That's why the field above is targetUserId, not userId: it keeps both values visible in the same log line instead of one overwriting the other.

## 🧩 Wire It Up Once, Inject Everywhere

```
// composition-root.ts
const logger: ILogger = new ConsoleLogger();
const userRepository: IUserRepository = new PostgresUserRepository(db, logger);
const paymentProvider: IPaymentProvider = new StripePaymentProvider(stripeClient, logger);
const orderService: IOrderService = new OrderService(userRepository, paymentProvider, logger);
const orderController = new OrderController(orderService, logger);
```

ILogger is injected everywhere as an interface consistently. If for some reason you need to switch to a new logger provider, you just reimplement the ILoggerinterface and replace it ConsoleLoggerwith the new one.

## 🌿 Where Business Decisions Get Logged

Repositories and providers log infrastructure. Services log why a request was accepted or rejected:

```
export class OrderService implements IOrderService {
constructor(
private readonly users: IUserRepository,
private readonly payments: IPaymentProvider,
private readonly logger: ILogger
) {

async createOrder(input: CreateOrderInput): Promise {
const user = await this.users.findById(input.userId);
if (!user) {
this.logger.warn('Order creation rejected', { reason: 'user_not_found', userId: input.userId });
throw new Error('User not found');
}

const payment = await this.payments.charge({
userId: user.id,
amountCents: calculateTotal(input.items),
});

if (!payment.approved) {
this.logger.warn('Order creation rejected', { reason: 'payment_declined', userId: user.id });
throw new Error('Payment declined');
}

this.logger.info('Order creation completed', { userId: user.id, paymentId: payment.id });
return createOrderEntity(user, input.items, payment);
}
}
}
```

This is the difference between logging errors and logging decisions. When a request fails, you know exactly why the system rejected it. Not just that something was thrown.

## 📊 What the Logs Look Like, Filtered by One Request

```
{"level":"info","message":"HTTP request started","requestId":"req_123","method":"POST","path":"/orders","userId":"user_42"}
{"level":"info","message":"Order creation started","requestId":"req_123","itemCount":3}
{"level":"info","message":"User lookup completed","requestId":"req_123","operation":"users.findById","found":true,"durationMs":18}
{"level":"error","message":"Payment provider charge failed","requestId":"req_123","provider":"stripe","operation":"payment.charge","durationMs":842,"error":{"message":"Request timeout"}}
{"level":"warn","message":"Order creation rejected","requestId":"req_123","reason":"payment_declined"}
{"level":"warn","message":"HTTP request completed","requestId":"req_123","status":400,"durationMs":911}
```

Filter by req_123 and the whole story reconstructs itself.

## ⚠ Log the Rejected Branches, Not Just Exceptions

Don’t wait for a stack trace to tell you something’s wrong. Log the branch your code intentionally took:

```
if (!input.items.length) {
logger.warn('Order creation rejected', { reason: 'empty_cart' });
throw new Error('Cart is empty');
}
```

Covers: validation failures, auth failures, rate limits, idempotency conflicts, not-found, provider declines, constraint violations, timeouts, retries exhausted, and circuit breakers.

## 🙈 What Not to Log

This helps you debug:

```
{ "message": "Payment charge failed", "provider": "stripe", "amountCents": 4200, "durationMs": 842, "statusCode": 500 }
```

This creates a security incident:

```
{ "cardNumber": "4242424242424242", "authorization": "Bearer secret", "requestBody": { "everything": "..." } }
```

## 🔁 Optional: Add One Method to ILogger Later

Everything above is the recommended default. Explicit try/catch, nothing hidden. If your codebase grows to dozens of repositories and providers all repeating that same 12-line start/complete/fail shape, you can fold it into ILogger itself as one more method:

```
export interface ILogger {
debug(message: string, context?: LogContext): void;
info(message: string, context?: LogContext): void;
warn(message: string, context?: LogContext): void;
error(message: string, context?: LogContext): void;

operation(
name: string,
context: LogContext,
fn: () => Promise,
getResultContext?: (result: T) => LogContext
): Promise;
}
```

```
async findById(id: string): Promise {
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

It adds an extra frame to every stack trace, and it makes the method less self-explanatory to whoever opens the file next. That's a real debugging cost, not a hypothetical one, so treat this as something to reach for once repetition has actually become painful, not as the default you start with.

## ✅ Checklist

- Generate/accept requestId at the HTTP boundary, return it in X-Request-ID ;

- Store request context with AsyncLocalStorage ;

- Logger merges context into every log automatically;

- JSON logs, not free-text strings;

- Inject ILogger as an interface through DI;

- Log start/completion/failure with duration around I/O boundaries, with plain try/catch ;

- Log rejected business branches with a reason ;

- Redact secrets centrally, not per call site;

- Watch for field-name collisions with request;

- Never log passwords, cookies, tokens, prompts, or full bodies;

## 🌙 Final Thought

Logging isn’t about printing more text. It’s about making production behavior reconstructible by someone who wasn’t watching when it broke.

Add the context. Inject the logger. Log the rejected and non-rejected branches. Redact aggressively. Keep the code honest about what it does before you reach for anything clever.

Future you, staring at logs at 2am, will actually thank you. 🙏
