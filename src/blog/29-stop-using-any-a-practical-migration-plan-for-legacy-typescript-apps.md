---
seoTitle: Stop Using “any”: A Practical Migration Plan for Legacy TypeScript Apps
slug: stop-using-any-a-practical-migration-plan-for-legacy-typescript-apps
tag: Refactoring
title: Stop Using “any”: A Practical Migration Plan for Legacy TypeScript Apps
subtitle: Legacy TypeScript codebases don't become unsafe suddenly. They start to become unsafe one any at a
intro: Legacy TypeScript codebases don't become unsafe suddenly. They start to become unsafe one any at a
date: May 27, 2026
readTime: 7 min read
excerpt: Legacy TypeScript codebases don't become unsafe suddenly. They start to become unsafe one any at a
---
![Stop Using “any”: A Practical Migration Plan for Legacy TypeScript Apps](/images/blog/stop-using-any-a-practical-migration-plan-for-legacy-typescript-apps/stop-using-any-a-practical-migration-plan-for-legacy-typescript-apps-header.webp)

Legacy TypeScript codebases don't become unsafe suddenly. They start to become unsafe one any at a time.

- A rushed API integration.
- A badly typed SDK.
- A JavaScript migration nobody had time to clean up.
- A temporary workaround that somehow became permanent.

Eventually, TypeScript remains in the project, but it is no longer safeguarding the components of the system where accuracy is crucial.

The concern is when any spreads across API contracts, business logic, database models, events, and shared packages. At that point, TypeScript becomes decoration.

This article is not about type purity. It is about removing⁣ any from a legacy TypeScript application without rewriting everything from scratch.

## 🧨 Why any Is Dangerous?

any disables TypeScript exactly where you use it.

This compiles:

```typescript
function calculateDiscount(user: any) {
if (user.subscription.plan === "premium") {
return 0.2;
}
return 0;
}
```

But TypeScript can’t tell you when subscription doesn’t exist, is misspelled, or has the wrong type. You only find out at runtime.

A safer version looks like this:

```typescript
type User = {
subscription?: {
plan: "free" | "premium";
};
};

function calculateDiscount(user: User) {
return user.subscription?.plan === "premium" ? 0.2 : 0;
}
```

Now TypeScript helps you.

It knows subscription may be missing the allowed values for plan, and forces the function to handle the data shape correctly.

That is the whole point.

## 🧠 The Real Problem Is Not One any

One or two isolated any incidents are not always a disaster.

The real problem starts when any crosses important boundaries:

```typescript
async function createPayment(payload: any) {
const amount = payload.amount;
const currency = payload.currency;
const customerId = payload.customer.id;
// process payment code below
}
```

This is risky because the function is close to a business-critical flow. Payments. Orders. Authentication. Authorization. Webhooks. Billing. User data. These are precisely the places where you do not want TypeScript to be silent.

A good rule would be

> any is most dangerous at the edges of your system and in the core of your business logic.

So do not migrate randomly.

Migrate by risk.

## ✅ Step 1: Measure Before You Fix

Before removing any, measure it.

A simple start:

```bash
grep -R "any" src --include="*.ts" --include="*.tsx"
```

A better option using ESLint:

```json
{
"rules": {
"@typescript-eslint/no-explicit-any": "warn"
}
}
```

Start with warn, not error. Turning every any into a build failure is a great way to make the team disable the rule.

Create a baseline instead:

```text
Current explicit any count: 438
Sprint 1 target: 350
Sprint 2 target: 250
Sprint 3 target: 150
```

Now the migration is measurable. And measurable work is easier to defend and to target.

## 🩹 Step 2: Stop New any From Spreading

Before fixing old code, prevent new any from entering the codebase. Legacy code can have debt, but new code should not increase the interest rate.

Start with:

```json
{
"rules": {
"@typescript-eslint/no-explicit-any": "warn"
}
}
```

Then make the rule stricter in new or critical modules:

```json
{
"overrides": [
{
"files": ["src/modules/payments/**/*.ts"],
"rules": {
"@typescript-eslint/no-explicit-any": "error"
}
}
]
}
```

This is realistic. You are not pretending the legacy codebase is perfect. You are simply saying the following:

> From now on, we stop making the problem worse.

## 🔐 Step 3: Replace any with unknown at Boundaries

Data from the outside world should not be trusted. That includes HTTP requests, webhooks, queues, third-party APIs, CSV imports, JSON files, and environment variables.

This is unsafe:

```typescript
async function parseWebhook(payload: any) {
return payload.event.type;
}
```

Use unknown instead:

```typescript
async function parseWebhook(payload: unknown) {
if (!isWebhookPayload(payload)) {
throw new Error("Invalid webhook payload");
}
return payload.event.type;
}
```

With a type guard:

```typescript
type WebhookPayload = {
event: {
type: string;
};
};

function isWebhookPayload(value: unknown): value is WebhookPayload {
return (
typeof value === "object" &&
value !== null &&
"event" in value
);
}
```

The difference is simple:

any says, “Trust me.”

unknown says, “Prove it first.”

That is undoubtedly what you want at system boundaries.

A quick example using unknownfor you to understand better what we are talking about:

```typescript
let value: unknown = "hello";
value.toUpperCase();
```

This does not compile.

The next segment compiles.

```typescript
let value: unknown = "hello";
if (typeof value === "string") {
value.toUpperCase();
}
```

As you can see, TypeScript forces you to check the value first.

## 🧪 Step 4: Validate External Data at Runtime

TypeScript checks your code. It does not validate JSON coming from an API, webhook, queue, database, or browser storage.

That is why runtime validation matters. A practical and common option is Zod:

```typescript
import { z } from "zod";

const WebhookPayloadSchema = z.object({
event: z.object({
type: z.string(),
}),
});

type WebhookPayload = z.infer;
function parseWebhook(payload: unknown): WebhookPayload {
return WebhookPayloadSchema.parse(payload);
}
```

Now the flow is safer:

```text
unknown input
→ runtime validation
→ typed data
```

This is much better than:

```typescript
const payload = rawPayload as WebhookPayload;
```

Because a type assertion does not validate anything. It only tells TypeScript to stop complaining.

## 🎯 Step 5: Fix High-Risk any First

Not all any usages deserve the same priority.

```bash
#Priority:
HTTP request bodies
Webhook payloads
Authentication data
Authorization claims
Payment flows
Database records
Shared packages
Public API clients
Message queue events
Configuration objects

#These can wait:
One-off scripts
Test mocks
Temporary migration files
Internal build tooling
Prototype code
```

These priority items can break important flows. It’s indispensable to control them, defining their types and boundaries, and creating a more attentive and aware system.

A good migration is not random. It is risk-based.

## ⚙️ Step 6: Tighten TypeScript Gradually

Do not enable every strict TypeScript option at once in a large legacy codebase. That usually creates hundreds or thousands of errors overnight.

Start with:

```json
{
"compilerOptions": {
"noImplicitAny": true
}
}
```

noImplicitAny is the right starting point because it directly targets the problem you're already solving. Without it, TypeScript silently infers any in ambiguous cases.

Then move toward:

```json
{
"compilerOptions": {
"strict": true
}
}
```

Once the codebase is stable with noImplicitAny, you can layer in strictNullChecks next - which tends to be the second biggest source of real bugs - and continue from there.

If you'd like, you can also create a new tsconfig, applying strict rules only to new code.

```json
{
"extends": "./tsconfig.json",
"compilerOptions": {
"strict": true
},
"include": ["src/modules/new-feature/**/*.ts"]
}
```

This lets new code follow better rules while legacy code is improved over time.

## 🧭 The Migration Plan

Here is the practical order we would follow:

```text
1. Measure current any usage
2. Add an ESLint warning for explicit any
3. Prevent new any in new or critical modules
4. Replace any with unknown at system boundaries
5. Add runtime validation for external data
6. Fix API clients and webhook handlers
7. Fix authentication, payment, and billing flows
8. Fix shared package exports
9. Enable stricter tsconfig options gradually
10. Add CI checks to prevent regressions
```

This works because it avoids the biggest migration mistake: trying to make everything perfect immediately.

> Make the system safer every week instead.

## 🚫 What Not to Do

- Do not replace every any with unknown blindly.
- Do not replace any ⁣with massive interfaces nobody understands.
- Do not enable strict across the whole project without a plan.
- Do not use type assertions everywhere just to make errors disappear.

This is not safety:

```typescript
const user = data as User;
```

If data is untrusted, validate it. Otherwise, you have only replaced one unsafe pattern with another.

The goal is not to shame people for old code. The goal is to make the codebase safer.

## ✅ Final Thoughts

You do not need to remove every any this week. But you do need a migration strategy.

- Start by measuring the problem. Stop new unsafe types from spreading.
- Replace any with unknown at system boundaries. Validate external data at runtime.
- Fix high-risk flows first. Tighten your compiler and linting rules gradually.
- Track progress over time.

The goal is not type purity. The goal is confidence. Because TypeScript cannot protect your application if you keep telling it to look away.

## About the Author

We’re a team of senior engineers who’ve shipped production systems across finance, fintech, and the nonprofit sector - for organizations like the Gates Foundation, JP Morgan, Interledger, and Filecoin, among others. At ARG, we help teams navigate the technical decisions that actually matter. Follow us for more practical deep dives into the technologies shaping modern development.
