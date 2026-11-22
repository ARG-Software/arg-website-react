---
seoTitle: Angular 19 End of Life: Upgrade Guide to Angular 22
slug: angular-19-end-of-life-upgrade-guide
author: Rui Rocha
authorUrl: https://www.linkedin.com/in/ruirochawork/
authorType: Person
authorSameAs: https://www.linkedin.com/in/ruirochawork/
tag: Frontend
tags: Frontend, Code Quality
title: Angular 19 Is End of Life: How to Upgrade to Angular 22 One Major at a Time
subtitle: Angular 19 is no longer supported, and Angular 20 leaves LTS on November 28, 2026. Which version to target, Node and TypeScript requirements, and the breaking changes from 19 to 20, 21, and 22.
intro: Angular 19 is no longer supported, and Angular 20 leaves LTS on November 28, 2026. Which version to target, Node and TypeScript requirements, and the breaking changes from 19 to 20, 21, and 22.
date: November 22, 2026
dateModified: November 22, 2026
readTime: 11 min read
---

![Angular upgrade path from 19 to 22 with Angular 19 marked end of life and the ng update command](/images/blog/angular-19-end-of-life-upgrade-guide/angular-19-end-of-life-upgrade-guide-header.webp)

Angular 19 no longer gets fixes. The official release page now says, "Angular v2 to v19 are no longer supported". If your app still runs on 19, every security issue found from now on stays open in your build.

Angular 20 is next. Its long-term support ends on **November 28, 2026**. After that date the only supported versions are 21 (LTS until June 2027) and 22 (active until June 2027, LTS until June 2028).

This guide covers what that means, which version to target, and what breaks on the way from 19 to 22. We moved a legacy app from [Angular 5 to 19](/blog/angular-5-to-19-migration/) one module at a time; the method here is the same, just with smaller steps.

## Is Angular 19 Still Supported?

No. Angular supports each major version for 24 months: 12 months of active support with regular updates, then 12 months of LTS with only critical fixes and security patches. Angular 19 is past both.

![Angular support dates in November 2026: Angular 22 active, 21 in LTS, 20 ending November 28, 2026, 19 not supported](/images/blog/angular-19-end-of-life-upgrade-guide/angular-support-status-technical-illustration-2.webp)

The last Angular 19 release in the official changelog is 19.2.25, published June 2, 2026. Nothing has shipped for 19 since.

One more change to plan around: until v22, Angular shipped a new major every six months. From v22 on, a major ships every 12 months, with four to six minor releases in between. Angular 23 is planned for around June 2027.

## What End of Life Means for Your App

Your app does not stop working on the end-of-life date. What stops is the upstream safety net:

- **No security patches.** A vulnerability found in `@angular/core`, the router or the compiler gets fixed in 21 and 22, not in 19.
- **Older Node and TypeScript.** Angular 19 needs Node 18, 20, or 22 and TypeScript below 5.9. Your toolchain stays pinned to versions that are themselves aging out.
- **The ecosystem moves on.** Component libraries, NgRx, and testing tools follow the supported Angular versions. Staying on 19 means pinning their old majors too.
- **Compliance questions.** Security reviews and customer audits often ask whether your framework is supported.

## Which Version Should You Target?

**Target Angular 22.** It is the active release. It is supported until June 2028, and with the new 12-month cycle, the next major is not due until around June 2027. Stopping at 21 gets you support only until June 2027, so you would be upgrading again within months.

Stopping at 20 makes no sense now: it loses support on November 28, 2026.

Angular does not support skipping majors with `ng update`. Go 19 to 20, 20 to 21, and 21 to 22, and get the app built and tested at each step.

## Before You Start: Node and TypeScript

Check the toolchain first. Each step needs its own Node and TypeScript range:

![Node.js, TypeScript and RxJS versions required by Angular 19.2, 20, 21 and 22, with Angular 22 on TypeScript 6.0](/images/blog/angular-19-end-of-life-upgrade-guide/angular-toolchain-per-step-technical-illustration-3.webp)

Two things stand out:

- **Node 18 ends at 19, and Node 20 ends at 21.** If your CI images still use Node 18, update them before the first step. For Angular 22, plan for Node 22.22.3 or later.
- **Angular 22 requires TypeScript 6.0, not 7.** TypeScript 7 is the [native Go compiler](/blog/typescript-7-rewritten-in-go/), and Angular 22 accepts only TypeScript 6.0.x.

Then prepare the branch:

1. Commit a clean, green build on 19.2 first.
2. Make sure the test suite runs. Several breaking changes below only show up in tests.
3. Update third-party Angular libraries to versions that support the next major before running each step.

Each step uses the same command:

```bash
ng update @angular/core@20 @angular/cli@20
```

Replace `20` with `21`, then `22`. `ng update` runs the official migrations for that major, so commit after each one to keep its changes reviewable.

## Angular 19 to 20: Breaking Changes

Angular 20 is mostly cleanup, but the template changes can break builds quietly.

- **Template expressions behave more like JavaScript.** `in` and `void` are now operators, not property names; use `this.void` if a component has a property called `void`. Parentheses are always respected, so `(foo?.bar).baz` now throws when `foo` is null or undefined.
- **`InjectFlags` is gone.** `inject()`, `Injector.get` and `TestBed.inject` no longer accept it. Use the options object instead, for example `inject(Service, { optional: true })`.
- **`TestBed.get` is removed.** Use `TestBed.inject`. `TestBed.flushEffects()` is also removed; use `TestBed.tick()`.
- **Renamed APIs.** `afterRender` becomes `afterEveryRender`. `provideExperimentalZonelessChangeDetection` becomes `provideZonelessChangeDetection`.
- **Errors are thrown, not swallowed.** Uncaught errors in listeners are now rethrown in tests by default, and `ApplicationRef.tick` throws instead of reporting to `ErrorHandler`. Expect some tests that passed accidentally to fail.
- **`ng-reflect-*` attributes are no longer produced.** If tests select on them, refactor or add `provideNgReflectAttributes()` temporarily.
- **Node 18 is dropped**, along with Node 22.0 to 22.10.

Angular 20 also **deprecates `*ngIf`, `*ngFor` and `*ngSwitch`** in favour of `@if`, `@for` and `@switch`. They still work, but run the control flow migration now (see below) while the diff is small.

## Angular 20 to 21: Breaking Changes

Angular 21 changes how change detection is wired, so read this step carefully if your app depends on ZoneJS.

- **No ZoneJS scheduler by default.** Angular no longer provides the ZoneJS-based change detection scheduler unless you ask for it. Apps that rely on ZoneJS must add `provideZoneChangeDetection()` to `bootstrapApplication` or the `AppModule`. The automated migration adds it for you. Check that it did.
- **`ignoreChangesOutsideZone` is removed.**
- **Server-side bootstrap takes a context.** `main.server.ts` must pass a `BootstrapContext` to `bootstrapApplication`. A schematic updates this automatically.
- **Host bindings are type-checked.** Hidden type errors in `host` bindings now fail the build. Fix them, or set `"typeCheckHostBindings": false` in `angularCompilerOptions` as a temporary escape hatch.
- **Removed APIs:** `NgModuleFactory` (use the NgModule class), `moduleId` and `interpolation` in component metadata, `UpgradeAdapter` (use `@angular/upgrade/static`), and the `ApplicationConfig` export from `@angular/platform-browser` (import it from `@angular/core`).
- **Router timing changed.** Navigations can take a few more microtasks to finish, and `lastSuccessfulNavigation` is now a signal you call. Tests that assert right after a navigation are the usual casualties: wait for navigation to complete first.
- **TypeScript 5.9 is required.**

## Angular 21 to 22: Breaking Changes

Angular 22 has the change with the biggest runtime impact of the three steps.

- **Components are `OnPush` by default.** A component without a `changeDetection` property now uses `OnPush`. Components that mutate objects in place or rely on default change detection will stop updating. To keep the old behaviour on a component, set `changeDetection: ChangeDetectionStrategy.Eager`. Test every screen after this step, not just the build.
- **Stricter template compiler.** Bindings that set the same input or output twice now throw, `data-` prefixed attributes no longer bind inputs or outputs, and elements matched by several component selectors fail at compile time. The nullish-coalescing and optional-chain diagnostics are now on, so expect new warnings; you can disable `nullishCoalescingNotNullable` and `optionalChainNotNullable` in `tsconfig` temporarily.
- **Factory APIs are removed.** `ComponentFactoryResolver` and `ComponentFactory` are gone; pass the component class to `ViewContainerRef.createComponent`. `createNgModuleRef` is replaced by `createNgModule`.
- **Router defaults changed.** `paramsInheritanceStrategy` now defaults to `'always'`, so child routes inherit all parent params. Set it to `'emptyOnly'` to keep the old behaviour. `provideRoutes()` is removed; use `provideRouter()`.
- **Forms and HTTP.** `min` and `max` validators no longer accept strings. Upload progress needs the XHR backend: `provideHttpClient(withXhr())`.
- **Hammer.js integration is removed.** Gestures need your own implementation.
- **TypeScript 6.0 is required.**

## Migrations Worth Running Along the Way

`ng update` handles the breaking changes. Angular also ships optional migrations that move code to the current style. Run them as separate commits, between steps, so each diff has one purpose:

```bash
# *ngIf, *ngFor and *ngSwitch to @if, @for and @switch
ng generate @angular/core:control-flow

# Constructor injection to inject()
ng generate @angular/core:inject

# @Input() to signal input()
ng generate @angular/core:signal-input-migration

# NgModules to standalone components
ng generate @angular/core:standalone
```

The control flow migration matters most: the old directives are deprecated since 20. The others are style moves you can schedule later.

If the codebase is loosely typed, the stricter compiler in 21 and 22 will surface many errors at once. Our [plan for removing `any` from legacy TypeScript](/blog/stop-using-any-a-practical-migration-plan-for-legacy-typescript-apps/) works for Angular apps too and is easier to do before the upgrade than during it.

## Coming From Angular 18 or Older?

The same rule applies: one major at a time. Below 19, the jumps get larger (module bootstrap, RxJS 7, NgRx changes, custom Webpack setups). Our [Angular 5 to 19 migration](/blog/angular-5-to-19-migration/) shows how we handled that on a real NgRx app, module by module, without stopping feature work.

## Upgrade Checklist

1. Green build and tests on Angular 19.2.
2. CI on Node 22.22.3 or later (Angular 22 needs it; 20 and 21 also accept it).
3. Run `ng update` to 20, fix, test, commit.
4. Run the control flow migration, test, and commit.
5. Run `ng update` to 21, confirm `provideZoneChangeDetection()` if you use ZoneJS, fix host binding types, test, and commit.
6. Run `ng update` to 22 with TypeScript 6.0, check every screen for `OnPush` regressions, test, and commit.
7. Update third-party Angular libraries at each step.

## FAQ

- **Is Angular 19 still supported?** No. Angular's release page lists v2 to v19 as no longer supported. The last 19.x release was 19.2.25 on June 2, 2026.
- **When does Angular 20 support end?** Angular 20 LTS ends on November 28, 2026. Angular 21 is supported until June 2027 and Angular 22 until June 2028.
- **Can I upgrade from Angular 19 directly to 22?** Not in one step. Run `ng update` once per major: 19 to 20, 20 to 21, then 21 to 22, building and testing after each.
- **Does Angular 22 support TypeScript 7?** No. Angular 22 requires TypeScript 6.0.x, so the Go-based TypeScript 7 compiler cannot build an Angular 22 app.

## Sources

- [Angular: Versioning and releases](https://angular.dev/reference/releases)
- [Angular: Version compatibility](https://angular.dev/reference/versions)
- [Angular: Migrations](https://angular.dev/reference/migrations)
- [Angular: Update guide](https://angular.dev/update-guide)
- [Angular on GitHub: CHANGELOG](https://github.com/angular/angular/blob/main/CHANGELOG.md)
