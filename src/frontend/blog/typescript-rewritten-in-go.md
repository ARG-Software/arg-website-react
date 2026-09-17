---
seoTitle: TypeScript 7 Native Go Port: What to Do
slug: typescript-7-rewritten-in-go
tag: Backend
tags: Backend, Architecture
title: TypeScript 7.0 Was Ported to Go. Here's Why You Should Care (and What to Do Today)
subtitle: TypeScript 7 is now the stable native compiler, with much faster builds and a few important compatibility boundaries. Here is how to adopt it.
intro: TypeScript 7 is now the stable native compiler, with much faster builds and a few important compatibility boundaries. Here is how to adopt it.
date: March 24, 2026
dateModified: September 17, 2026
readTime: 8 min read
mediumUrl: https://arg-software.medium.com/typescript-7-rewritten-in-go
---

![TypeScript 7.0 rewritten in Go](/images/blog/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-header.webp)

If you're a TypeScript developer, the biggest compiler shift in the project's history has landed. [TypeScript 7.0 shipped on July 8, 2026](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) as the stable native port of the compiler and language service to Go. TypeScript 6.0 is the final release from the JavaScript codebase, while TypeScript 7 is now the current `typescript` package on npm.

![TypeScript 7.0 rewritten in Go Benchmarks](/images/blog/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-stats.webp)

But here's the thing: this is a port, not a clean-sheet rewrite, and the preview instructions are now obsolete. Let us explain why this matters, what's changing, and exactly what you need to do today.

## The Numbers That Matter

First, let's talk about what "10x faster" actually means. The TypeScript team ran full-build benchmarks on real-world codebases and reported speedups from 7.7x to 11.9x in the TypeScript 7.0 release announcement.

![TypeScript 7.0 rewritten in Go Improvement](/images/blog/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-improvement.webp)

Those are benchmarks, not a promise that every build becomes exactly ten times faster. Project shape, hardware, checker count, and available memory all matter. The stable compiler supports incremental builds, project references, build mode, watch mode, JavaScript emit, and declaration emit. Benchmark your own repository before sizing the CI win.

This isn't just about saving time. It's about changing your workflow: instant feedback loops, faster CI/CD pipelines, better developer experience, and more frequent type checking (because it no longer hurts).

## Why Go? Why Now?

The existing TypeScript compiler was written in TypeScript and compiled to JavaScript because using the team's own language made sense. But over the years, the codebase grew into a massive, complex tool that has to parse, type-check, emit, and power editors for millions of developers.

The old implementation was not designed to take full advantage of shared-memory parallelism. Large projects could pay for long startup, checking, and editor load times.

The Go port combines native code with shared-memory multithreading and compiler-specific optimizations. The team deliberately [ported the existing implementation](https://github.com/microsoft/typescript-go/discussions/410) instead of designing a new type checker, because preserving TypeScript's many inference details and quirks was essential for compatibility.

The result is a compiler that can parse, check, and emit in parallel, with major improvements in full-build and editor startup times on the projects Microsoft measured.

## The Catch: It Is a New Toolchain

TypeScript 7 is a production release, but "ported faithfully" does not mean every integration is unchanged. The official release notes document new defaults, removed legacy options, intentional JavaScript and JSDoc changes, and one major ecosystem boundary: TypeScript 7.0 does not ship a stable programmatic compiler API.

These are the differences worth checking instead of relying on a snapshot test count from an old preview.

### Module Resolution Differences

TypeScript 7 removes the old `node` and `node10` module resolution modes, the `classic` mode, and `baseUrl`. Use `nodenext` for Node.js projects or `bundler` for projects whose bundler resolves imports. Path mappings are relative to the project unless you write another explicit base into each path:

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

### New Defaults Are Real Changes

TypeScript 7 carries forward TypeScript 6's new defaults. Among them, `strict` is on, `types` defaults to an empty list, `rootDir` defaults to the directory containing the config, `module` defaults to `esnext`, and `target` defaults to the latest stable ECMAScript target. Be explicit where your project needs something else:

```json
{
  "compilerOptions": {
    "strict": true,
    "rootDir": "./src",
    "types": ["node", "jest"]
  },
  "include": ["./src"]
}
```

### Template Literal Inference Changed

One intentional type-system change is concrete and documented: template literal inference now consumes a complete Unicode code point instead of half of a UTF-16 surrogate pair.

```typescript
type HeadTail<S> = S extends `${infer Head}${infer Tail}` ? [Head, Tail] : never;

type Result = HeadTail<"😀abc">;
// TypeScript 6: ["\uD83D", "\uDE00abc"]
// TypeScript 7: ["😀", "abc"]
```

### The Programmatic API Is Not Yet Stable

TypeScript 7.0's `tsc` is ready for production, but its old JavaScript API is not part of the native package. Tools that import `typescript`, use custom transformers, embed the language service, or depend on TypeScript server plugins may still need the TypeScript 6 compatibility package. Check each tool's TypeScript 7 support rather than assuming command-line compatibility means API compatibility.

### Legacy Targets and Options Are Gone

TypeScript 7's lowest output target is ES2015. It also rejects options deprecated during the TypeScript 6 bridge release, including `downlevelIteration`, `outFile`, AMD, UMD, SystemJS, and `moduleResolution: node10`. If you still need ES5 output, use another transpilation step or stay on a compatible TypeScript 6 toolchain while you migrate.

```json
{
  "compilerOptions": {
    "target": "es2015",
    "module": "nodenext"
  }
}
```

### JavaScript and JSDoc Have Intentional Differences

The native compiler's JavaScript checking was reworked to behave more like TypeScript source. Some Closure-style JSDoc constructs are no longer recognized. For example, values used in JSDoc type positions now need `typeof`:

```javascript
const FORWARD = 1;
const BACKWARD = 2;

/** @typedef {typeof FORWARD | typeof BACKWARD} Direction */
```

The archived port repository keeps a detailed [list of intentional TypeScript 6 and 7 differences](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md). That is a better migration checklist than speculative edge cases.

## What Changed in TypeScript 6.0

TypeScript 6.0 [shipped on March 23, 2026](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) as the final release from the JavaScript codebase. It was the bridge release: `strict` became the default, `types` defaulted to an empty list, `rootDir` changed, and legacy targets and module settings were deprecated or removed. TypeScript 7 enforces that migration boundary.

TypeScript 6 is still useful when a build tool needs the old programmatic API. That does not make it the current compiler. The standard `typescript` package now installs TypeScript 7, while [`@typescript/typescript6`](https://www.npmjs.com/package/@typescript/typescript6) exists for compatibility.

## What You Need to Do Today

The teams that test now avoid the scramble later. Here's your action plan.

Before replacing the compiler, check the framework around it. Microsoft's TypeScript 7 release notes say Vue, MDX, Astro, and Svelte workflows still need TypeScript 6 for their embedded-language tooling. Angular can use TypeScript 7 for command-line checks while parts of its editor and tool integration remain on TypeScript 6. Those projects should start with the side-by-side setup below instead of treating a successful `tsc` run as proof that the whole toolchain is ready.

### Step 1: Install the Stable Compiler
```bash
npm install --save-dev typescript
npx tsc --version
```

This installs the stable native compiler as `tsc`. The old `@typescript/native-preview` package and its `tsgo` command were the preview path, not the current installation path.

### Step 2: Run Your Existing Check
```bash
npx tsc --noEmit
```

Start with the same project and flags you use in CI. If you use project references, run your normal build mode command too.

### Step 3: Fix the Differences

If TypeScript 7 reports errors, separate compiler configuration changes from tooling integration problems. Check `types`, `rootDir`, module resolution, removed options, JavaScript and JSDoc differences, and whether any part of the toolchain imports the TypeScript API.

### Step 4: Keep TypeScript 6 Only Where Needed

Most projects should use TypeScript 7 directly. If a tool still requires the TypeScript 6 API, [Microsoft's supported compatibility setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60) installs the native compiler under an alias and keeps TypeScript 6 under the package name expected by older tools:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

That gives you `tsc` for TypeScript 7 and `tsc6` for the JavaScript implementation:

```bash
npx tsc --noEmit
npx tsc6 --noEmit
```

## The Bigger Picture: What This Means for the Ecosystem

This port didn't happen in isolation. It follows a broader move toward native implementations in JavaScript tooling, but it does not make every frontend tool native or remove JavaScript from the toolchain.

![TypeScript 7.0 rewritten in Go Comparison](/images/blog/typescript-7-rewritten-in-go/typescript-7-rewritten-in-go-comparison.webp)

The practical result is tighter feedback where TypeScript was the bottleneck. The size of that win depends on your project, and it does not automatically speed up unrelated bundling, testing, or deployment work.

## A Word on AI-Assisted Development

The TypeScript team has connected lower latency with larger windows of semantic information for AI-assisted tools. That is an opportunity, not a guarantee that generated code will type-check on the first try. The immediate benefit is simpler: humans and tools can ask the compiler for feedback more often and wait less for the answer.

## FAQ

- **Will my existing code work?** TypeScript 7 aims for TypeScript 6 compatibility, but new defaults, removed options, and documented JavaScript differences can require changes. Run your own build.
- **When did TypeScript 7.0 ship?** July 8, 2026. The current stable npm release is 7.0.2 as of September 17, 2026.
- **Where is the JavaScript-based compiler?** TypeScript 6 is the final JavaScript line. The `@typescript/typescript6` compatibility package provides its API and a `tsc6` executable.
- **Do I need the native preview?** No. Stable TypeScript 7 comes from `typescript` and runs as `tsc`. The preview package used `tsgo` during development.
- **What about compiler plugins or custom transformers?** TypeScript 7.0 has no stable programmatic compiler API. Check the specific tool's support and keep TypeScript 6 available where its API is still required.
- **Will my editor use TypeScript 7 automatically?** It depends on the editor. VS Code has Microsoft's TypeScript 7 extension, Visual Studio selects it from the workspace, and other editors can integrate through LSP.

## The Bottom Line

TypeScript's Go port is a major change to the TypeScript toolchain. It is not just about a headline benchmark. Faster full builds, quicker editor startup, parallel project work, and lower feedback latency can change how often teams type-check and how quickly CI responds.

But speed can still come with migration work. Install the stable compiler, run your real build, and audit tools that rely on the old API:
```bash
npm install --save-dev typescript
npx tsc --version
npx tsc --noEmit
```

Fix the concrete differences you find. Keep TypeScript 6 only where a tool still needs it, and measure the result on your own codebase.
