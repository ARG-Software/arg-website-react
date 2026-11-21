---
seoTitle: Agent Skills for Angular, React Native and Extensions
slug: agent-skills-part-2-angular-react-native-browser-extension
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture, Frontend
title: Frontend Skills That Keep Agents on Our Patterns: Angular, React Native, and Browser Extensions
subtitle: Part 2 - Open-source agent skills for Angular with NgRx, React Native with Expo, and Manifest V3 browser extensions for Claude Code, Cursor, Codex, and Copilot.
intro: Part 2 - Open-source agent skills for Angular with NgRx, React Native with Expo, and Manifest V3 browser extensions for Claude Code, Cursor, Codex, and Copilot.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 9 min read
---

![Agent skills Part 2 cover with the Angular and React Native logos and a browser extension puzzle icon](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-part-2-angular-react-native-browser-extension-header.webp)

Part 2 of 3 in **Skills We Give Our Coding Agents**. [Part 1](/blog/agent-skills-part-1-dotnet-nx-mcp-backend/) explains what an agent skill is and covers our back-end skills. This part covers the front end.

Frontend code is where coding agents go wild the fastest. There's always a shortcut close by: load data straight from the component that shows it, read saved data right inside the click handler, and call the browser right where the button is. Each shortcut works on the day it's written. Six months later, the business rules are spread across screens, and nothing can be tested without opening a browser or a phone. Upgrading the framework means touching every screen.

The three skills in this part fight that in three different places: an Angular web app, a React Native mobile app, and a browser extension. The tools are different, but the idea is the same. Business rules live in their own layer. Anything specific to the platform sits behind small adapters, thin wrappers your code talks to, instead of the platform.

![Angular, React Native, and browser extension agent skills compared by adapters, state, guardrails, and tests](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-front-end-guardrails-technical-illustration-2.webp)

## ARG Angular: an Angular and NgRx app that stays organised

**What goes wrong without it.** Agents write Angular the way most tutorials do: one component that calls the server itself, keeps its own copy of the data, and mixes display formatting with business logic. That works until a second team joins. Then nobody knows which part of the app owns which data.

**What the skill makes the agent do.** The app is split into layers: business rules, app logic, outside connections (the server and browser storage), and screens. Business rules don't depend on Angular or NgRx at all, so they can be tested on their own and survive framework upgrades. Every server call and every bit of browser storage goes through one layer, and a lint rule flags any component that calls the server directly with `HttpClient`.

There are clear rules for where data lives. NgRx Store holds the data the whole app shares. SignalStore holds data that only one feature needs, and the skill explains when to use which. Data from the server is converted into the shape the screen needs before it gets there, screens only redraw when their data actually changes, and settings are loaded when the app starts instead of being baked in when it's built.

**Where it came from.** Our Angular and NgRx reference app, with its own store per feature and a shared set of UI components. It was built on an older Angular with NgModules and Karma, for a former client who makes smart parts for several companies. He needed a custom production ERP that tracked total output and each machine's output by the second, so he could see whether his daily orders would be filled on time.

The skill brings it up to the current release, with standalone components, signals, Vitest or Jest for unit tests, and Playwright for end-to-end tests. If you're starting from an older codebase, our [Angular 5 to 19 migration](/blog/angular-5-to-19-migration/) story shows what that journey looks like in practice.

**When it kicks in.** Starting or extending an app; adding a feature, page, component, or store; connecting to an API; choosing between NgRx Store and SignalStore; writing tests; setting up CI and releases.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-angular
```

Full details: [ARG Angular skill](/skills/arg-angular/).

## ARG React Native: fast on real phones, proven with numbers

**What goes wrong without it.** Mobile performance advice is full of misinformation, and agents repeat it. Wrap everything in `memo`, swap the list component, add another library, and so on. Nobody measures, so nobody knows if it helped, and the phone-specific code ends up mixed into the screens.

**What the skill makes the agent do.** Business rules don't depend on the phone, the network, or the UI library. The camera, location, notifications, storage, and server calls all sit behind small adapters, so features can be tested without a phone. Server data is handled by TanStack Query, and local data lives in small stores, so a screen only redraws when its own data changes.

The part we care about most: performance work always starts with a measurement, on a release build, on a real mid-range phone. From there the skill covers scrolling lists, animations with Reanimated, startup time, app size, memory leaks, and native modules (Turbo Modules). It also covers the road to the app stores: tests, automated end-to-end runs with Maestro or Detox, CI, builds with EAS or Fastlane, updates sent straight to users' phones without a new store release, and numbered versions.

**Where it came from.** It combines our own architecture rules with performance tips inspired by Callstack's open-source React Native best practices, published under the MIT license and rewritten to fit this structure. The result is an app that's easy to change, with speed you can prove with numbers. We use it on our own app, [Fabletopia](https://fabletopia.app), which makes bedtime stories for children, using AI to generate the stories, the narration, and the images.

**When it kicks in.** Starting or extending a React Native or Expo app; adding a screen or a phone feature; choosing how to manage data; fixing laggy animations, slow lists, slow startup, or a big app size; setting up tests, CI, and builds.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-react-native
```

Full details: [ARG React Native skill](/skills/arg-react-native/).

## ARG Browser Extension: Manifest V3 that survives hundreds of features

**What goes wrong without it.** Extensions start small and grow sideways. The popup calls the browser's tab functions directly, a script on the page copies a helper from the background code, and adding Firefox or Safari turns into a rewrite because browser calls are everywhere.

Manifest V3, Chrome's current set of rules for extensions, adds its own challenge. The background part of an extension used to run all the time. Now it starts only when it's needed and stops when it's idle, so code that assumed it was always running has to be built differently.

**What the skill makes the agent do.** Business rules live in their own layers, and everything that talks to the browser (tabs, storage, page scripts, messages, network events) goes through small adapters. Supporting a new browser means writing one new adapter. Every layer rule is an automated test, so a screen that calls the browser directly fails the build before it reaches the main branch.

Just keep in mind that Safari has some limitations. For example, it doesn't give you the same deep access to read or block network requests like Firefox or Chromium-based browsers.

![Manifest V3 extension surfaces reaching browser APIs only through adapters, guarded by architecture tests](/images/blog/agent-skills-part-2-angular-react-native-browser-extension/agent-skills-browser-extension-adapters-technical-illustration-3.webp)

Shared helpers live in one folder with no outside dependencies, so code is never copied between files. Settings, timeouts, and limits live in one config file. Work follows the same workflow as every ARG skill: a branch per change, a reviewed pull request, automated checks before merging, and automatic numbered releases with a generated changelog.

**Where it came from.** It's the playbook behind ARG Architect, our Manifest V3 extension in production. It checks websites for security, performance, and AI readiness and runs a multilingual AI model right in the browser, without sending data to a server. We wrote about building it in our guide to a [Chrome extension with React and Vite](/blog/chrome-extension-react-vite/) and in the story of our [website audit browser extension](/blog/website-audit-browser-extension/).

**When it kicks in.** Starting a new extension; adding a feature or fixing a bug; using a browser feature; adding another browser; running AI on the device; checking the layers; setting up CI, settings, and releases.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-browser-extension
```

Full details: [ARG Browser Extension skill](/skills/arg-browser-extension/).

## One shape, three platforms

Put the three side by side, and the same shape shows up. The platform (Angular, the phone, and the browser) stays at the edges, behind adapters. Business rules sit in the center, where you can test them without it. Lint rules or automated tests check the boundaries and fail the build when someone crosses them. And every change goes through the same review and release steps.

That's on purpose. A developer who knows one ARG frontend can find their way around the other two, and so can a coding agent.

Next up: [Part 3: Skills That Check the Work](/blog/agent-skills-part-3-code-review-security-audit-devops/), covering code review, security audits, website audits, and DevOps setup.

## FAQ

- **Is there an agent skill for Angular with NgRx?** Yes. The ARG Angular skill covers standalone components, signals, the NgRx Store for data the whole app shares, and SignalStore for data one feature needs, with lint rules that keep the layers apart.
- **How do I make an AI agent improve React Native performance?** Install the ARG React Native skill. It makes the agent measure on a release build on a real mid-range phone before changing anything, then covers lists, animations, startup time, app size, memory leaks, and native modules.
- **Does the browser extension skill work for Firefox and Safari?** Yes. Browser calls sit behind small adapters, so supporting another browser means writing one thin adapter instead of rewriting the extension.
- **Can I install only one skill?** Yes. Pass the skill name to the tool, for example `npx skills add ARG-Software/arg-agent-skills --skill arg-angular`.

## Sources

- [Chrome for Developers: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Agent Skills: Overview](https://agentskills.io/)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
