---
seoTitle: Claude Code Skills for .NET, Nx and MCP Servers
slug: agent-skills-part-1-dotnet-nx-mcp-backend
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture, Backend
title: Teaching Coding Agents Our Back End: .NET, Nx, and MCP Skills
subtitle: Part 1 - Open-source Claude Code skills for .NET, Nx monorepos, and MCP servers. What a SKILL.md is, how agents load it, and the rules each skill enforces.
intro: Part 1 - Open-source Claude Code skills for .NET, Nx monorepos, and MCP servers. What a SKILL.md is, how agents load it, and the rules each skill enforces.
date: November 8, 2026
dateModified: November 8, 2026
reviewedOn: November 8, 2026
readTime: 10 min read
collection: agent-skills
collectionTitle: Skills We Give Our Coding Agents
collectionPart: 1
---

![Agent skills Part 1 cover with the .NET, Nx and MCP logos next to a back-end API server icon](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-part-1-dotnet-nx-mcp-backend-header.webp)

Part 1 of 3 in **Skills We Give Our Coding Agents**. This part explains what an agent skill is and covers our three back-end skills. Part 2 covers the front end, and Part 3 the skills that check the work.

Ask a coding agent to add a feature to a .NET app, and you usually get code that compiles and passes the tests it wrote for itself. But it ignores how the rest of the app is built, talks to the database from the wrong place, throws errors where the rest of the app returns a clear result, among other things.

That's not the agent being lazy. Nobody told it the rules, at least not in a way it can read. So we wrote them down as open-source agent skills: the habits we use on client work, packaged so Claude Code, Cursor, Codex, OpenCode, and Copilot follow them too.

## What an agent skill is

An agent skill is a folder with a file called `SKILL.md` in it. At the top of the file there's a name and a brief description. Below that are the instructions for the agent, in plain text. The folder can also hold extra reference files and scripts that the instructions point to.

The nice part is that the agent doesn't read all of it up front. It goes in three steps:

1. **It sees the list.** When you start a session, the agent only reads each skill's name and description. Anthropic puts that at about 100 tokens per skill, which is a few lines of text, so installing ten skills costs almost nothing.
2. **It opens the right one.** When your request matches a description, the agent reads that skill's full `SKILL.md`.
3. **It follows it.** The agent works through the instructions and only opens the extra files when it needs them.

![A coding task matched against skill descriptions, then the full SKILL.md loaded and its rules and checks applied](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-how-an-agent-picks-up-a-skill-technical-illustration-2.webp)

That's why the description matters so much. It's the only thing the agent sees before it decides, so it has to say what the skill does and when to use it.

`SKILL.md` is an open format, so the same skill works in any agent that supports it. You install one with a single command, using the free `skills` tool from Vercel Labs. It copies the skill into the folder your agent reads:

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet
```

Leave out `--skill` to pick from the list, or install all ten at once.

## Why we wrote our rules as skills

Every ARG skill comes from a real project we maintain: a reference app, a starter template or a product in production. Each time we turned one into a skill, we found the same thing: parts of the original had gone out of date, and some rules only existed in people's heads.

So every skill follows two rules:

- **Every rule needs a check.** Where we can, a rule is backed by something that fails the build, like an automated test or a lint rule. An agent can misread a sentence. It can't argue with a failing build.
- **The same workflow everywhere.** Each change gets its own branch, a reviewed pull request with a standard title, automated checks (CI) before merging, and numbered releases. So the agent's work arrives looking like a teammate's.

## ARG .NET: business rules in one place, on the latest .NET

**What goes wrong without it.** Agents flatten .NET apps. Business rules end up in the code that handles web requests, errors get thrown around instead of handled, and tests fake the database so much that they prove nothing about what really gets saved.

**What the skill makes the agent do.** The app is split into four parts: the business rules (Domain), what the app does (Application), the database and outside services (Infrastructure), and the web API. Automated tests with NetArchTest fail the build if one part reaches into another the wrong way. The business objects hold the rules and return a clear success or failure instead of throwing errors, and the API turns every failure into the same standard error response. The user doesn't need to be informed about app-specific errors, but you do, and that is the logger's job.

Each feature is one small, self-contained piece: one action or one question, with its own handler and its own input checks. When something important happens, like a booking being confirmed, the message about it is saved in the same step as the data, using a [transactional outbox](/patterns/transactional-outbox/). That way a message is never lost and never sent for a change that didn't save. Tests run against real databases inside containers with Testcontainers, not fakes.

![ASP.NET Core layers guarded by architecture tests, and a domain event saved to an outbox in the same transaction](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-dotnet-layers-and-outbox-technical-illustration-3.webp)

**Where it came from.** Our [.NET reference app on GitHub](https://github.com/ARG-Software/Clean-Architecture) is a booking platform built with domain-driven design, CQRS, an outbox, Keycloak for login, and Testcontainers. We explain how it's put together in our guide to [pragmatic clean architecture in ASP.NET Core](/blog/pragmatic-clean-architecture-aspnet-core/). Three things in it had aged: it was on .NET 8, it relied on MediatR, which now needs a paid license, and it saved outbox messages in an unsafe way. The skill fixes all three, uses the current long-term support version of .NET, and asks you how you want to handle MediatR. If you'd rather drop it entirely, our guide to [CQRS without MediatR](/blog/cqrs-without-mediatr/) shows the simple version.

**When it kicks in.** Starting or extending a .NET app; adding business objects, actions, queries, or endpoints; setting up the database with EF Core, login, caching, or health checks; writing tests; setting up CI and Docker.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet
```

Full details: [ARG .NET skill](/skills/arg-dotnet/).

## ARG Nx Monorepo: many services, one workspace

**What goes wrong without it.** A monorepo keeps many apps and services in one repository, which makes it easy to use anything from anywhere. Agents take the shortest path. Within a few weeks, code reaches into parts it shouldn't, services read each other's database tables, and every small change rebuilds everything.

**What the skill makes the agent do.** It sets up NestJS services and a Next.js website in one Nx workspace with pnpm. Each service covers one part of the business and owns its own data. No service reads another's tables, which is the [database per service](/patterns/database-per-service/) pattern. Code is split into libraries with labels, and Nx checks on every build which library is allowed to use which.

Services talk by sending messages through Kafka or RabbitMQ, and the message formats are versioned so one service can't break another by changing them. An outbox makes sure no message is lost when a save succeeds, and getting the same message twice does no harm. CI uses `nx affected` to build and test only what changed, and each app gets its own Docker image and version number.

**Where it came from.** Our [Nx and NestJS monorepo boilerplate](/blog/nx-nestjs-monorepo-boilerplate/). When we reviewed it, we found what goes wrong in most monorepos: boundaries nobody checked, code reaching into the wrong layer, thin tests, and CI that rebuilt everything. Each of those is now a written rule with a check behind it.

**When it kicks in.** Starting or extending the workspace; adding an app, library, service, or message handler; choosing between Kafka and RabbitMQ; naming services and queues; setting up CI, Docker images, and releases.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-nx-monorepo
```

A skill that sets up microservices doesn't decide whether you need them. That's a question for you, and it's what our piece on [microservices vs a modular monolith](/blog/microservices-vs-modular-monolith-prove-it-before-you-split/) is about. Full details: [ARG Nx Monorepo skill](/skills/arg-nx-monorepo/).

## ARG MCP Server: your app, usable by AI assistants

**What goes wrong without it.** MCP (Model Context Protocol) is the standard way AI assistants connect to other apps and use them. Ask an agent to "add MCP support" and it tends to build a second back end next to yours, with its own database queries, its own permission checks, and its own error handling. A month later, your normal API and the AI version disagree about who's allowed to do what.

**What the skill makes the agent do.** It starts by matching what an AI assistant needs to do with what your app can already do. Each MCP tool calls exactly one existing action in your app, with the same permissions and the same errors as your API. The MCP server is just a thin entry point next to the API, and automated checks keep business logic and permission checks out of it, so the two never drift apart.

Servers accessed over the internet use OAuth for login, as the MCP spec describes, and assistants get clear error messages instead of raw crash output. Servers that run on your own machine talk through standard input and output (stdio) and aren't exposed to the network at all. The server is tested with a real MCP client, and the skill writes setup instructions for Claude Code, Claude Desktop, Cursor, VS Code, Codex, and OpenCode.

**Where it came from.** Our [NestJS MCP starter on GitHub](https://github.com/ARG-Software/Nestjs-mcp-starter), where a REST API, an MCP server, and a background worker share the same core. The approach works for any Node.js or TypeScript back end. We also use it ourselves on our website.

**When it kicks in.** Adding MCP support to an API; making an app usable from AI assistants; choosing between a local (stdio) and a remote (HTTP) server; adding OAuth to a remote server; testing and documenting an MCP server.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-mcp-server
```

Full details: [ARG MCP Server skill](/skills/arg-mcp-server/).

## What the three have in common

Look past the different tools, and it's the same idea each time. Business rules live in their own place. A tool checks the boundaries, not someone's memory. Messages about saved changes go through an outbox. Tests use real databases where it matters. And every change goes through the same branch, review, and release steps.

That's the whole point. An agent with these skills doesn't just write code that works. It writes code that fits in with the rest, which is what keeps a system easy to change a year from now.

Next up: [Part 2: Frontend Skills That Keep Agents on Our Patterns](/blog/agent-skills-part-2-angular-react-native-browser-extension/), covering Angular, React Native, and browser extensions.

## FAQ

- **What is a SKILL.md file?** It's the main file in an agent skill folder. It starts with a `name` and a `description`, followed by instructions for the agent, and it can point to extra reference files and scripts.
- **How do I install a Claude Code skill?** Run `npx skills add` with the repository and skill name, for example `npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet`. The tool copies the skill into the folder your agent reads.
- **Do agent skills work with Cursor, OpenCode, Codex, and Copilot?** Yes. `SKILL.md` is an open format, and the ARG skills work with any agent that supports it, including Claude Code, Cursor, Codex, OpenCode, and Copilot.
- **Do installed skills fill up the context window?** Barely. The context window is how much text the agent can keep in mind at once. At startup it only reads each skill's name and description, and it reads the full instructions only when your request matches.

## Sources

- [Agent Skills: Overview](https://agentskills.io/)
- [Agent Skills: Specification](https://agentskills.io/specification)
- [Anthropic: Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Vercel Labs: skills, the open agent skills tool](https://github.com/vercel-labs/skills)
- [Model Context Protocol: Specification](https://modelcontextprotocol.io/specification)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
- [ARG Software: Clean-Architecture](https://github.com/ARG-Software/Clean-Architecture)
- [ARG Software: Nestjs-mcp-starter](https://github.com/ARG-Software/Nestjs-mcp-starter)
