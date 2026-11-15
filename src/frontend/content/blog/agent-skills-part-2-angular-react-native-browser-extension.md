---
seoTitle: Agent Skills for Angular, React Native and Extensions
slug: agent-skills-part-2-angular-react-native-browser-extension
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture, Frontend
title: Part 2: Front End Skills That Keep Agents on Our Patterns: Angular, React Native and Browser Extensions
subtitle: Open-source agent skills for Angular with NgRx, React Native with Expo, and Manifest V3 browser extensions, for Claude Code, Cursor, Codex and Copilot.
intro: Open-source agent skills for Angular with NgRx, React Native with Expo, and Manifest V3 browser extensions, for Claude Code, Cursor, Codex and Copilot.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 9 min read
---

![Agent skills Part 2 cover with the Angular and React Native logos and a browser extension puzzle icon](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-part-2-angular-react-native-browser-extension-header.webp)

Part 2 of 3 in **Skills We Give Our Coding Agents**. [Part 1](/blog/agent-skills-part-1-dotnet-nx-mcp-backend/) explains what an agent skill is and covers our back-end skills. This part covers the front end.

Front-end code is where coding agents drift fastest. There is always a shortcut within reach: call `fetch` from the component, read `localStorage` in the click handler, put the browser API call right where the button is. Each shortcut works on the day it is written. Six months later, the business rules are spread across components, nothing can be tested without a browser or a phone, and a framework upgrade means touching every screen.

The three skills in this part push back on that drift in three very different environments: an Angular web app, a React Native mobile app and a browser extension. The stacks differ, but the idea is the same in all three. Business rules live in their own layer, the platform sits behind small adapters, and a tool, not a reviewer's memory, enforces the boundary.

![Angular, React Native and browser extension agent skills compared by adapters, state, guardrails and tests](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-front-end-guardrails-technical-illustration-2.webp)

## ARG Angular: NgRx on standalone components and signals

**What goes wrong without it.** Agents write Angular the way most tutorials do: a component that injects `HttpClient`, holds its own copy of server state, and mixes formatting with business logic. It works until the second team joins, then nobody knows which store owns what.

**What the skill makes the agent do.** The app is split into domain, application, infrastructure and feature layers. Business rules never depend on Angular or NgRx, so they can be tested in isolation and survive framework upgrades. Every HTTP call and every browser storage access sits in the infrastructure layer behind an interface, and lint rules flag a component that reaches for `HttpClient` directly.

State has clear rules. The global NgRx Store, with typed action groups, effects and memoised selectors, handles shared state. SignalStore handles local feature state, and the skill explains when each one fits. Server data passes through pure mappers before it reaches the UI, components use OnPush change detection, and runtime configuration is loaded once at startup instead of being baked in at build time.

**Where it came from.** Our Angular and NgRx reference application, a manufacturing dashboard with feature stores, effects, container components and a shared UI kit. The original targeted an older Angular with NgModules and Karma. The skill brings it to the current release, with standalone APIs, signals, Vitest or Jest for unit tests and Playwright for end-to-end tests. If you are starting from an older codebase, our [Angular 5 to 19 migration](/blog/angular-5-to-19-migration/) story shows what that journey looks like in practice.

**When it kicks in.** Scaffolding or extending an app; adding a feature, route, component, store, effect, API service, interceptor or guard; choosing between the global Store and a SignalStore; writing component, store or end-to-end tests; setting up CI and releases.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-angular
```

Full details: [ARG Angular skill](/skills/arg-angular/).

## ARG React Native: fast on real devices, proven with numbers

**What goes wrong without it.** Mobile performance advice is full of folklore, and agents repeat it. Wrap everything in `memo`, swap the list component, add a library. Without a measurement, nobody knows whether the change helped, and the device code ends up tangled with the screens.

**What the skill makes the agent do.** Business rules are independent of the device, the network and the UI kit. Camera, location, notifications, storage and API calls sit behind small adapters, so features can be tested without a phone. Server data is handled by TanStack Query, and local state lives in small stores that components read through selectors, so screens re-render only when their data changes.

The part we care about most: performance work always starts with a measurement on a release build, on a real mid-range device. From there the skill covers list performance, animations with Reanimated, startup time, bundle and app size, memory leaks and Turbo Modules. The path to the stores is covered too: unit and component tests, end-to-end flows with Maestro or Detox, CI, EAS or Fastlane builds, over-the-air updates and versioned releases.

**Where it came from.** It combines our own architecture rules with performance guidance inspired by Callstack's open-source React Native best practices, published under the MIT licence and rewritten for this layered structure. The result is an app whose features are easy to change and whose speed is backed by numbers.

**When it kicks in.** Scaffolding or extending a React Native or Expo app; adding a screen, use case, native module or device API; choosing state management; fixing dropped frames, slow lists, re-renders, slow startup or large bundles; setting up tests, CI and builds.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-react-native
```

Full details: [ARG React Native skill](/skills/arg-react-native/).

## ARG Browser Extension: Manifest V3 that survives hundreds of features

**What goes wrong without it.** Extensions start small and grow sideways. A popup calls `chrome.tabs` directly, a content script duplicates a helper from the background code, and supporting Firefox or Safari turns into a rewrite because browser APIs are called from everywhere.

Manifest V3 adds its own pressure. Chrome moved the background context from a long-lived page to service workers that run only when needed, so code that assumed a permanent background page has to be structured differently.

**What the skill makes the agent do.** Business rules live in their own layers, and browser APIs (tabs, storage, scripting, messaging, network events) stay behind small adapters. Supporting a new browser means writing one thin adapter class. Every layer rule is an architecture test in CI, so a UI component that calls a browser API directly fails the build before it reaches the main branch.

![Manifest V3 extension surfaces reaching browser APIs only through adapters, guarded by architecture tests](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-browser-extension-adapters-technical-illustration-3.webp)

Reusable helpers live in one dependency-free library folder, so logic is never copied between files. Configuration, timeouts and limits live in one config module. Work follows the same ARG workflow as every other skill: a branch per change, a reviewed pull request with a Conventional Commit title, CI before merge and automatic versioned releases with generated changelogs.

**Where it came from.** This is the playbook behind ARG Architect, our production Manifest V3 extension. It audits websites for security, performance and AI readiness, and runs a multilingual AI model entirely in the browser without sending data to a server. We wrote about building it in our guide to a [Chrome extension with React and Vite](/blog/chrome-extension-react-vite/) and in the story of our [website audit browser extension](/blog/website-audit-browser-extension/).

**When it kicks in.** Starting a new extension; adding a feature or fixing a bug; calling a browser API; adding support for another browser; running AI on the device; reviewing layer boundaries; setting up CI, environment variables and releases; preparing a branch and pull request.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-browser-extension
```

Full details: [ARG Browser Extension skill](/skills/arg-browser-extension/).

## One shape, three platforms

Put the three skills side by side and the shape repeats. The platform (Angular, the phone, the browser) is pushed to the edge behind adapters. Business rules sit in the middle where they can be tested without it. Boundaries are enforced by lint rules or architecture tests that fail the build. And every change travels through the same review and release workflow.

That repetition is deliberate. A developer who knows one ARG front end can find their way around the other two, and so can a coding agent.

Next up: [Part 3: Skills That Check the Work](/blog/agent-skills-part-3-code-review-security-audit-devops/), covering code review, security audits, web audits and DevOps setup.

## FAQ

- **Is there an agent skill for Angular with NgRx?** Yes. The ARG Angular skill covers standalone components, signals, the global NgRx Store with typed action groups and effects, and SignalStore for local feature state, with lint rules enforcing the layer boundaries.
- **How do I make an AI agent improve React Native performance?** Install the ARG React Native skill. It makes the agent measure on a release build on a real mid-range device before changing anything, then covers lists, Reanimated animations, startup time, bundle size, memory leaks and Turbo Modules.
- **Does the browser extension skill work for Firefox and Safari?** Yes. Browser APIs sit behind small adapters, so supporting another browser means writing one thin adapter class instead of rewriting the extension.
- **Can I install only one skill?** Yes. Pass the skill name to the CLI, for example `npx skills add ARG-Software/arg-agent-skills --skill arg-angular`.

## Sources

- [Chrome for Developers: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Agent Skills: Overview](https://agentskills.io/)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
