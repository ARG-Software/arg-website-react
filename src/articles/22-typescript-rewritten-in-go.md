---
slug: typescript-7-rewritten-in-go
tag: TypeScript · Performance
title: TypeScript 7.0 Is Being Rewritten in Go. Here's Why You Should Care (and What to Do Today)
subtitle: The end of an era for JavaScript's most beloved compiler - and the beginning of 10x faster builds.
date: March 24, 2026
readTime: 8 min read
mediumUrl: https://arg-software.medium.com/typescript-7-rewritten-in-go
excerpt: TypeScript 6.0 RC is the last JavaScript-based release ever. Starting with TypeScript 7.0, the compiler is being rewritten in Go — with 10x faster type checking on large codebases. Here's what's changing, what breaks, and exactly what you need to do today.
---

![TypeScript 7.0 rewritten in Go](/images/articles/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-header.webp)

If you're a TypeScript developer, last week brought news that will fundamentally change how you work. The TypeScript 6.0 RC dropped - and it's the last JavaScript-based release ever. Starting with TypeScript 7.0 (codenamed "Project Corsa"), the compiler is being rewritten in Go. The early benchmarks are awesome: 10x faster type checking on large codebases.

![TypeScript 7.0 rewritten in Go Benchmarks](/images/articles/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-stats.webp)

But here's the thing: TypeScript 6.0 is the release you should care about right now. Let us explain why this matters, what's changing, and exactly what you need to do today to avoid migration headaches tomorrow.

## The Numbers That Matter

First, let's talk about what "10x faster" actually means in practice. The TypeScript team ran benchmarks on real-world codebases.

![TypeScript 7.0 rewritten in Go Improvement](/images/articles/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-improvement.webp)

Your tsc today taking 45 seconds on a large project? With tsgo, that becomes 4-5 seconds. Incremental builds, project references, --build mode - all ported and working.

This isn't just about saving time. It's about changing your workflow: instant feedback loops, faster CI/CD pipelines, better developer experience, and more frequent type checking (because it no longer hurts).

## Why Go? Why Now?

The TypeScript compiler was originally written in JavaScript (specifically TypeScript itself) because it made sense: the team used their own language. But over the years, the codebase grew. Today, the TypeScript compiler is a massive, complex piece of software that has to parse, type-check, and emit code for millions of developers.

The JavaScript-based compiler has fundamental limitations: it is single-threaded by nature, memory-intensive for large projects, and slow to start due to JIT compilation.

Go solves all of these: true parallelism with goroutines, native compilation to machine code, efficient memory management, and excellent performance for CLI tools.

The result? A compiler that starts instantly, checks types in parallel, and finishes in seconds.

## The Catch: 74 Edge Cases

The new Go-based compiler already passes 19,926 out of 20,000 compiler test cases - 99.6% compatibility. But those remaining 74 edge cases matter if your codebase relies on any of them.

The TypeScript team has documented several categories where differences may occur.

### Module Resolution Differences

The new compiler aligns more closely with how Node.js actually resolves modules today. If your project uses path aliases or older resolution shortcuts, you may hit errors. For example:
```typescript
// tsconfig.json
{
  "paths": {
    "@utils/*": ["src/utils/*"]
  }
}

// This may no longer resolve
import { formatDate } from "@utils/date";
// (expecting date/index.ts to be found automatically)

// Be explicit instead
import { formatDate } from "@utils/date/index";
```

### isolatedModules Enforcement

Tools like Babel and esbuild transpile each file independently, without seeing the full project. The new compiler is stricter about ensuring your code is safe for this. Re-exporting a type without the `type` keyword used to be allowed:
```typescript
// This will now error
export { MyType } from "./types";

// Do this instead
export type { MyType } from "./types";
```

### Type Inference in Complex Conditional Types

The new compiler is more precise when evaluating conditional types, which can expose type errors that the old compiler let slide:
```typescript
type OnlyStrings<T> = T extends string ? T : never;

type Result = OnlyStrings<"hello" | 42 | "world">;
//   Old compiler → string          ← collapses literals into the base type
//   New compiler → "hello" | "world"  ← preserves the exact literals

/* The old compiler knew the result was string-like,
but lost the specific values along the way.
   The new one keeps "hello" and "world" as distinct literals,
 which matters the moment you do something like:

const greet = (val: Result) => {
  if (val === "hello") { ... } // old: maybe works. new: guaranteed safe.
 }

*/
```

### Declaration Evaluation Order

When you have circular imports, the new compiler is stricter about the order in which types are resolved. In the old compiler, this could silently produce incorrect types depending on which file was evaluated first:
```typescript
// user.ts
import { Role } from "./role";

export type User = {
  name: string;
  role: Role;
};

// role.ts
import { User } from "./user";

export type Role = "admin" | "editor";

export type RoleWithUser = {
  role: Role;
  assignedTo: User; // circular - User imports Role, Role imports User
};
```

### const enum Handling

`const enum` works by replacing every usage with the actual value at compile time, instead of generating a real JavaScript object. The old compiler did this aggressively, even across file boundaries:
```typescript
// constants.ts
export const enum Direction { Up = "UP", Down = "DOWN" }

// app.ts
move(Direction.Up);
// Old compiler silently inlined → move("UP")
// New compiler → error
```

The new compiler refuses to inline `const enum` values imported from another file, because single-file tools like Babel and esbuild can't do that safely - they never see constants.ts when processing app.ts. The fix is simple:
```typescript
// Regular enum (generates a real JS object)
export enum Direction { Up = "UP", Down = "DOWN" }

// Or a plain const object
export const Direction = { Up: "UP", Down: "DOWN" } as const;
```

If you use `const enum` across multiple files, this is the most likely breaking change you'll hit.

### Exhaustiveness Checks with never

A common pattern is using `never` as a guard to ensure every case in a union is handled:
```typescript
type Shape = { kind: "circle" } | { kind: "square" };
function handle(shape: Shape) {
  switch (shape.kind) {
    case "circle": ...
    case "square": ...
    default:
      const _check: never = shape; // errors if a case is missing
  }
}
```

Add a new member to the union without handling it, and the default branch is reachable - meaning shape can't be `never` anymore. The old compiler sometimes missed this. The new one always catches it:
```typescript
type Shape = { kind: "circle" } | { kind: "square" } | { kind: "triangle" };
//                                                        ^ not handled
// Old compiler → no error
// New compiler → Type '{ kind: "triangle" }' is not assignable to type 'never'
```

This is the new compiler working in your favour - it's catching real bugs that previously slipped through silently. The TypeScript team has published a preliminary list of known incompatibilities in GitHub issue #61754. Running tsgo in diagnostic mode will help you identify if any of these affect your project.

## What's Changing in TypeScript 6.0

TypeScript 6.0 introduces several deprecations and behavioral changes designed to prepare your codebase. Strict mode is now enabled by default - if you've been relying on loose checking, now's the time to fix those `any` implicits. ES5/ES3 targets are deprecated; TypeScript 6.0 warns you and 7.0 will remove support. Generics inference is stricter in edge cases where TypeScript was previously too forgiving. Module resolution aligns better with actual Node.js behavior, which may affect some monorepo setups. Legacy `tsconfig.json` configuration options from 2015 are being removed.

## What You Need to Do Today

The teams that test now avoid the scramble later. Here's your action plan.

### Step 1: Install the Preview
```bash
npm i @typescript/native-preview
```

This installs the Go-based compiler as `tsgo` in your `node_modules/.bin`.

### Step 2: Run Both Compilers Side-by-Side
```bash
npx tsc --noEmit   # current compiler
npx tsgo --noEmit  # new native compiler
```

Compare the output. Do you get the same errors? Different ones? Any crashes?

### Step 3: Fix the Differences

If tsgo reports errors that tsc doesn't, or vice versa, investigate. These are exactly the edge cases you need to address. Common issues to watch for: different type inference in complex generics, stricter null checks in certain patterns, different module resolution for non-standard paths.

### Step 4: Update Your CI Pipeline

Add both compilers to your CI for a while. Run them in parallel and alert on differences. This gives you a safety net while you migrate.

## The Bigger Picture: What This Means for the Ecosystem

This rewrite isn't happening in isolation. It's part of a broader trend. TypeScript is the last major piece of the JavaScript toolchain to go native. When TypeScript 7.0 ships, the entire modern frontend development stack will be native.

![TypeScript 7.0 rewritten in Go Comparison](/images/articles/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-comparison.webp)

The result? Build pipelines that were minutes become seconds. Dev servers that were seconds become instant.

## A Word on AI-Assisted Development

The TypeScript team specifically mentioned that the Go rewrite will enable better AI integration. Why? Because a faster compiler means faster language servers, which means faster IDE feedback, which means faster AI completions. When your language server can re-type-check the entire project in 5 seconds instead of 45, AI tools can provide more contextually aware completions, suggest refactorings with instant type feedback, and generate code that actually type-checks on first try. The 10x speedup isn't just about your waiting time - it's about enabling a new class of developer tools.

## FAQ

- **Will my existing code work?** For the vast majority of projects, yes. The TypeScript team is prioritizing compatibility. But you should test now to be sure.
- **When will TypeScript 7.0 ship?** No official date yet, but given that 6.0 RC is out and the Go compiler already passes 99.6% of tests, probably within months, not years.
- **Will the JavaScript-based compiler disappear immediately?** It will be deprecated but likely maintained for a transition period. However, new features will only land in the Go version.
- **Do I need to change my code?** TypeScript 6.0 will warn you about things that need to change. Address those warnings, and you'll be ready.
- **What about tsc plugins or custom transformers?** The Go version won't support JavaScript-based plugins. This is a significant change - if you rely on custom transformers, you'll need alternatives or to wait for a new plugin system.
- **Will Deno/Bun/Node support the new compiler?** The TypeScript team is working with runtime authors to ensure smooth integration. The Go compiler can be used as a library, so expect native integrations.

## The Bottom Line

TypeScript's rewrite in Go is the most significant change to the JavaScript ecosystem since ES6. It's not just about speed - though 10x faster compilation is life-changing. It's about what that speed enables: better developer experience, more sophisticated tooling, AI integration that actually works, faster CI/CD, and happier, more productive teams.

But speed comes with a migration cost. The teams that test now, with TypeScript 6.0 and the tsgo preview, will be the ones shipping faster when 7.0 lands. Don't wait until the old compiler is gone. Install the preview today:
```bash
npm i @typescript/native-preview
npx tsgo --version
```

Then run it alongside your current build. Find the edge cases. Fix them now. Your future self will thank you.
