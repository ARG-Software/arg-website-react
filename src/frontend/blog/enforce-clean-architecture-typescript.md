---
seoTitle: Enforce Clean Architecture in TypeScript
slug: enforce-clean-architecture-typescript
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: Architecture
tags: Architecture, Backend, Testing
title: How to Actually Enforce Clean Architecture in TypeScript
subtitle: Stop relying on PR reviews to enforce architecture. Learn how to use architecture tests to automatically enforce principles.
intro: Stop relying on PR reviews to enforce architecture. Learn how to use architecture tests to automatically enforce principles.
date: March 15, 2026
dateModified: September 17, 2026
reviewedOn: September 17, 2026
readTime: 7 min read
mediumUrl: https://arg-software.medium.com/the-rules-are-in-the-readme-the-readme-is-a-lie-ce6597218a29
---

![TypeScript Clean Architecture rules documented in the README](/images/blog/the-rules-are-in-the-readme/the-rules-are-in-the-readme-header.webp)

You wrote the docs. You did the PR reviews. You explained it in the onboarding. And yet, six months later, a bunch of controllers are directly importing a repository, and nobody noticed.

## The Real Problem With Architecture

Clean Architecture, Hexagonal, Layered: whatever you're following, the rules only exist in two places: your head, and a README nobody reads.

The moment a deadline hits, someone takes a shortcut. A controller calls a repository directly. A domain model imports a NestJS decorator. An infrastructure class leaks into your application layer. It's not malicious. It's invisible. Nobody gets a red light. The tests still pass. The app still ships.

Six months later, you have a codebase that looks structured but behaves like a mess.

The fix isn't more PR comments or awareness. It's making the rules prevail.

## Architecture Tests: Rules That Enforce Themselves

Architecture tests are automated tests that don't test your logic. They test your structure. They answer questions like: Does anything in the domain layer import from infrastructure? Is any controller talking directly to a repository? Do all use cases follow the naming convention we agreed on?

If the answer is ever yes, the build fails. No human needed.

We're going to use [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS), published on npm as `archunit` and inspired by ArchUnit from the Java world.

```bash
npm install --save-dev archunit
```

### Setting The Rules

Let's say you're running a NestJS app with a layered structure:

```text
src/
  domain/         # Entities, value objects, domain errors
  application/    # Use cases, service interfaces
  infrastructure/ # Repositories, ORM, external services
  http/           # Controllers, DTOs, HTTP concerns
```

Here are the rules you actually care about enforcing.

Domain must not know about the application or infrastructure layers. The current API does not have an `or()` combinator, so make each forbidden direction explicit:

```typescript
import { projectFiles } from 'archunit';

it('domain should not depend on application', async () => {
  const rule = projectFiles()
    .inFolder('src/domain/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/application/**');
  await expect(rule).toPassAsync();
});

it('domain should not depend on infrastructure', async () => {
  const rule = projectFiles()
    .inFolder('src/domain/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/infrastructure/**');
  await expect(rule).toPassAsync();
});
```

Controllers must not talk directly to repositories:

```typescript
it('controllers should not import repositories directly', async () => {
  const rule = projectFiles()
    .inFolder('src/http/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/infrastructure/repositories/**');
  await expect(rule).toPassAsync();
});
```

The application layer must not depend on the infrastructure:

```typescript
it('application should not depend on infrastructure', async () => {
  const rule = projectFiles()
    .inFolder('src/application/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/infrastructure/**');
  await expect(rule).toPassAsync();
});
```

### Enforcing Naming Conventions

Beyond dependency direction, you can enforce the conventions your team agreed on, the ones currently living in a Notion doc nobody opens.

All use cases must end with UseCase:

```typescript
it('use cases must follow naming convention', async () => {
  const rule = projectFiles()
    .inFolder('src/application/use-cases/**')
    .should()
    .haveName('*UseCase.ts');
  await expect(rule).toPassAsync();
});
```

ArchUnitTS's file API checks files, paths, dependencies, and file content. It does not provide the declaration selectors shown in some examples online, such as `areInterfaces()` or `haveNameMatching()`. If your team keeps each interface in a dedicated file, enforce the filename instead.

Domain interface files must be prefixed with I:

```typescript
it('domain interfaces should be prefixed with I', async () => {
  const rule = projectFiles()
    .inFolder('src/domain/interfaces/**')
    .should()
    .haveName(/^I[A-Z].*\.ts$/);
  await expect(rule).toPassAsync();
});
```

Infrastructure interfaces must be prefixed with I:

```typescript
it('infrastructure interfaces should be prefixed with I', async () => {
  const rule = projectFiles()
    .inFolder('src/infrastructure/interfaces/**')
    .should()
    .haveName(/^I[A-Z].*\.ts$/);
  await expect(rule).toPassAsync();
});
```

No circular dependencies:

```typescript
it('should have no circular dependencies', async () => {
  const rule = projectFiles()
    .inFolder('src/**')
    .should()
    .haveNoCycles();
  await expect(rule).toPassAsync();
});
```

## The Silent Killer Other Libraries Miss

Here's something worth knowing before you pick any architecture testing library: a passing test on zero files is worse than no test at all.

Imagine you write this rule:

```typescript
const rule = projectFiles()
  .inFolder('src/doamin/**') // typo: should be 'domain'
  .shouldNot()
  .dependOnFiles()
  .inFolder('src/infrastructure/**');
```

Most libraries will happily match zero files, run zero checks, and report passing. Your architecture rule silently does nothing forever.

ArchUnitTS fails this by default. It reports an empty test, and it won't pass until your pattern actually matches files. You can opt out with `allowEmptyTests`, but architecture boundaries are usually safer with the default. The behavior is documented in the project's [check options](https://github.com/LukasNiessen/ArchUnitTS#check-methods-check-vs-topassasync). It's a small thing, but it's the kind of false confidence that causes real incidents.

## Why This Changes Everything

The usual way of enforcing architecture is expensive: pair programming is good but doesn't scale, PR reviews catch it late and create friction, documentation is ignored under pressure, and verbal agreements are forgotten by next sprint.

Architecture tests flip the model. You write the rule once, and it runs on every single push forever. A developer can't accidentally break your dependency rules without the CI pipeline telling them immediately, with a clear message about exactly which file violated which rule.

This also makes onboarding easier. Instead of explaining "we don't import repositories in controllers here", you just say "try it and see what breaks." The tests become living documentation that actually stays up to date.

## The Takeaway

Your architecture is only as strong as your ability to enforce it. Docs rot, memory fades, and deadline pressure is real. Architecture tests turn your structural rules into something that actually has grips, and they run for free on every push for the rest of the project's life.

Add them to your CI pipeline, write them the same day you establish a new rule, and never have another "how did this get in here" moment in a PR review again.

![TypeScript Clean Architecture just fix it later meme](/images/blog/the-rules-are-in-the-readme/the-rules-are-in-the-readme-meme.webp)
