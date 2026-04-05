---
slug: angular-5-to-19-migration
tag: Angular · Migration
title: Upgrading Angular Legacy Project Version 5 to 19
subtitle: A real-world account of migrating a heavily customized Angular 5 app to Angular 19 — NgRx, Webpack, and all.
date: April 21, 2025
readTime: 12 min read
mediumUrl: https://arg-software.medium.com/upgrading-angular-legacy-project-version-5-to-19-0216c5dd389a
excerpt: At ARG, we recently completed a frontend migration for a client project originally built with Angular version 5. Here are the key challenges we faced and how we solved them.
---

![Upgrading Angular Legacy Code](/images/articles/angular-migration/upgrading-angular-legacy.webp)

At ARG, we recently completed a frontend migration for a client project originally built with Angular version 5. The project heavily relied on Redux-style state management using NgRx, which made the upgrade particularly interesting.

Migrating this legacy codebase to Angular 19 was no small feat. Over the weeks, we navigated challenges ranging from outdated Webpack configurations to modernizing state management with the latest @ngrx/signals. In this article, we share key challenges and how we addressed them-offering practical examples and takeaways for anyone updating an older Angular app.

> TL;DR — Migrated from Angular 5 → 19. Incremental migration using CLI. Fixed bootstrap, injection, and compatibility issues. Preserved NgModules + RxJS. DevTools and @ngrx/signals implementation.

## Issues with the Project

The frontend initially wouldn't even compile or run, also the client didn't provide us with the backend application. Being built with Angular 5 and a heavily customized Webpack configuration, the build pipeline was completely incompatible with modern versions of tools. And on the build stage, no concrete error pointed to what was failing - the compiler and Webpack just spewed vague warnings and errors, which pointed to a mistake in a package, which upon investigation pointed to a potential fix of using an older version of Node 12 and 14 and older version of Python 2, which made sense given the project was built on those versions of Node, but even that didn't help. So we had to find another solution to start the project.

![Project file structure](/images/articles/angular-migration/project-file-structure.png)

## Missing Backend: Handling the Constraint

When the client requested a modernization of this app, they didn't provide the original backend API, which was originally written in .NET/C#. This introduced a significant constraint - we had to ensure the app functioned as expected without access to the real backend.

Rather than mock out specific services or create a new backend from scratch, we focused on interface-first development. That meant analyzing how the frontend consumed data based on the types and interfaces and simulating service responses directly in Angular services using static data. So we designed endpoints and interactions based on observed UI behavior.

This allowed us to test the entire UI, validate business logic, and modernize state management - even without the original backend in place. Should the backend become available later, these services can easily be swapped out for real API calls with minor effort.

## Angular CLI vs. Custom Webpack: Which One?

Since the project didn't build and our goal was to update it, a big early decision was whether to continue with the custom Webpack (outdated) setup, or migrate this project into Angular CLI.

Given the complexity and time it would take to fully understand and modernize the Webpack config (and the benefits Angular CLI offers in terms of tooling, performance, and schematics), we decided to create a fresh Angular CLI project and start moving modules piece by piece into it.

![Webpack vs Angular CLI Comparison Table](/images/articles/angular-migration/webpack-vs-cli-table.webp)

## Modular Codebase: Migrating One Module at a Time

One of the key advantages of this migration was the original project's modular architecture. The Angular 5 codebase was already organized using NgModules, with each feature encapsulated in its module containing components, services, and NgRx state (actions, reducers, effects, and selectors).

In addition, the app followed solid architectural patterns: a shared module for common UI components and utilities, and a core module for global services like authentication and app configuration.

This structure made it significantly easier to modernize the app. We migrated one module at a time into a new Angular CLI-based project, which allowed us to:

- **Isolate issues within specific features.** Each module could be debugged independently without affecting the rest of the app.
- **Test and validate each module independently.** We could confirm correctness before moving on.
- **Resolve compatibility issues in a focused way.** Narrowing scope made problems easier to identify and fix.

By upgrading the app module-by-module, we were able to move forward incrementally - with fewer surprises and more confidence at every step.

## Package Compatibility

We had dozens of outdated packages with breaking changes:

- **RxJS from v5 to v7+.** Many operators were removed or renamed.
- **@ngx-charts, @clr/* packages, faker, etc.** Many APIs were deprecated or completely rewritten.

We updated or replaced packages as needed, and in some cases, we had to read through migration guides and GitHub issues to discover the correct way to use them.

## Main Module Bootstrap Issue

At one point, the entire app failed to bootstrap. The error was cryptic, and Angular gave no helpful stack trace.

Solution: We removed all modules and re-added them one by one to identify the problem. Eventually, we found the culprit: one module was importing a component that wasn't included in the modules' declarations array. This was one of the most painful errors to fix due to misleading errors in the console.

## Injection Issues in Modules

Angular's newer strict DI mode exposed missing providers and incorrect injection tokens in services and feature modules.

We updated module imports, provided services at the correct levels, and fixed inconsistent injection patterns (e.g., constructor parameters that didn't match @Injectable() definitions).

## Converting Components: Keeping standalone: false

While Angular 14+ introduced standalone components as a modern alternative to NgModules, we made a conscious decision not to use standalone components in this project. Instead, we kept all component definitions with standalone set to false.

![Component decorator example with standalone: false](/images/articles/angular-migration/standalone-false-decorator.webp)

This decision was made for a reason we believe is the core angular way of structuring modules. So while we modernized much of the project - including RxJS and NgRx updates - we chose to retain the classic NgModule structure for component declarations to ensure long-term stability and reduce migration risk. Also Angular by default uses standalone: true in its component declarations so we had to explicitly set it to false for it to work with the older structure.

## Project Structure: Keeping What Worked

While many modern Angular projects adopt newer architectural patterns like Signals or standalone components, we chose to retain our original modular structure built around classic NgRx and RxJS patterns. Upgrading from RxJS v5 to v7+ introduced many breaking changes that required refactoring.

We didn't reinvent the wheel - we just brought each module up to newer versions:

- **@Effect() decorators were replaced with createEffect().** The old decorator-based API was removed in NgRx 15.
- **RxJS chaining was rewritten using .pipe().** Dot-chaining was removed in RxJS 6.
- **Deprecated APIs like toPromise() were updated to firstValueFrom() or lastValueFrom().** These are the idiomatic replacements in RxJS 7+.

The modular file structure (actions, reducers, effects, and selectors split per feature) gave us:

- **Clarity.** Each file had a single purpose.
- **Scalability.** Teams could work on different features without stepping on each other.
- **Predictability.** We knew where to look when updating or debugging code.
- **Stability.** Since the structure didn't change, we avoided regressions and onboarding friction.

![File structure for a module](/images/articles/angular-migration/module-file-structure.webp)

![NgRx workflow for a specific module](/images/articles/angular-migration/ngrx-workflow.webp)

## Property Accessibility Errors

One of the side effects of upgrading to a modern Angular version was that the template compiler became stricter about property visibility. Previously, Angular templates could access protected properties from the component class without issues - even though this technically violated TypeScript's access modifiers. However, in Angular 15+ (especially with stricter TypeScript settings), this is no longer allowed. Templates now only have access to public properties and methods, which aligns with how TypeScript is intended to work.

Fix: We updated many component properties and methods from protected to public to ensure they were accessible from the template. This change didn't affect runtime behavior but was essential to remove compile-time template errors and make component APIs explicit. This also reinforces good practices: anything used in the template should be intentionally marked as public.

## angular.json and AOT Issues

With AOT (Ahead Of Time compilation) enabled by default, templates had to be strictly valid. We had to:

- **Fix all *ngIf misuse.** Incorrect usage that was silently accepted by JIT would now fail at compile time.
- **Ensure all template variables were properly typed.** Any implicit any in templates had to be resolved.
- **Clean up missing pipes and invalid references.** AOT validates the entire template graph at build time.

Changing from JIT to AOT created errors in every .html file which had to be fixed.

## TypeScript & tsconfig Changes

Newer TS versions enabled stricter checks, which flagged:

- **Unused or undefined variables.** The compiler now errors on variables declared but never used.
- **Mismatched interface contracts.** Any object literal that didn't fully satisfy an interface was rejected.
- **Missing return types.** Functions without explicit return types were flagged under strict mode.

We had to tune the tsconfig.json progressively to enable stricter rules, which created more issues, but it helped catch bugs early and improved overall app stability.

![App Config Changes](/images/articles/angular-migration/app-stability.webp)

## Clarity UI Compatibility

The original project relied heavily on Clarity UI, but after upgrading to Angular 19, we found that the latest versions of Clarity packages had breaking changes-especially in styles. To maintain visual consistency and avoid a full design overhaul, we imported the old clr-ui CSS files, because they were completely different than the new ones. Using old CSS files with new icons created layout conflicts, which had to be manually resolved. This hybrid approach allowed us to keep the original app design while using the newer versions of the Clarity UI.

## Module-by-Module Rendering and Chart Fixes

Many modules used @swimlane/ngx-charts, which had updated APIs. So we had to refactor input bindings to match new chart options and add fallback logic for missing data. This ensured legacy formats were transformed into the new chart structures.

## Warning Fixes (Accessibility)

Modern Angular flagged missing labels, id-for mismatches, and more:

- **Input elements needed aria-label, id, etc.** Any interactive element without accessible labeling was flagged.
- **Label elements had to match the for attribute.** Orphaned labels that didn't reference a valid input id were reported.

We also resolved these to silence warnings and improve accessibility.

## Redux DevTools Integration

To improve debugging and gain better visibility into our application's state, we added @ngrx/store-devtools. This allowed us to inspect dispatched actions, track state changes over time, and even time-travel through state history. It's a small addition that greatly improves developer experience, especially during migrations and feature development.

![Redux DevTools Integration](/images/articles/angular-migration/redux-devtools-integration.webp)

## NgRx Signals: Experimenting with Simpler State Management

We took the opportunity to explore the newly introduced @ngrx/signals package. Signals promise a more lightweight, declarative approach to state management-especially compared to the traditional NgRx setup with actions, reducers, selectors, and effects. We tried Signals in two of our feature modules. The experience was surprisingly smooth: less boilerplate, clear state updates, using patchState(), and automatic reactivity thanks to Angular Signals.

While this worked great for those localized modules, we kept RxJS and classic NgRx architecture for the rest of the app. In our case, RxJS still felt more natural and powerful - especially in modules where effects often relied on stream transformations like switchMap, concatMap, withLatestFrom, and catchError to coordinate actions and handle responses.

## Final Thoughts

This wasn't just a migration but a full modernization of the project's Angular ecosystem. From resolving bootstrapping challenges and migrating legacy RxJS code to experimenting with Signal Stores, this effort delivered a much-needed overhaul. The process had its bumps, but it ultimately laid a strong foundation for a modern, scalable Angular application.

As for our exploration of Signals, they proved to be an excellent fit for managing simple UI-bound state and reactive logic. However, RxJS offered greater flexibility and control for more complex, feature-rich scenarios. We came away with a solid appreciation for Signals, but given the scale and needs of our project, RxJS remained the better long-term choice.

![App running in the new Angular version](/images/articles/angular-migration/app-running-angular-19.webp)

You can check out the code example, by clicking here.
