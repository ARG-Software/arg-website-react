---
seoTitle: Claude Code Skills for .NET, Nx and MCP Servers
slug: agent-skills-part-1-dotnet-nx-mcp-backend
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture, Backend
title: Part 1: Teaching Coding Agents Our Back End: .NET, Nx and MCP Skills
subtitle: Open-source Claude Code skills for .NET, Nx monorepos and MCP servers. What a SKILL.md is, how agents load it, and the back-end rules each skill enforces.
intro: Open-source Claude Code skills for .NET, Nx monorepos and MCP servers. What a SKILL.md is, how agents load it, and the back-end rules each skill enforces.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 10 min read
---

![Agent skills Part 1 cover with the .NET, Nx and MCP logos next to a back-end API server icon](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-part-1-dotnet-nx-mcp-backend-header.webp)

Part 1 of 3 in **Skills We Give Our Coding Agents**. This part covers what an agent skill is and our three back-end skills. Part 2 covers the front end, and Part 3 the skills that check the work.

Ask a coding agent to add a feature to a .NET solution and it will usually produce code that compiles, passes the tests it wrote itself, and quietly ignores how the rest of the solution is built. The handler talks to the database directly. The new endpoint throws exceptions where every other endpoint returns a result. The domain event is published before the transaction commits.

None of that is the agent being careless. It simply does not know the rules, because nobody wrote them down in a form it can use. Our answer is a set of open-source agent skills: the habits we apply on client work, packaged so Claude Code, Cursor, Codex, OpenCode and Copilot follow them too.

## What an agent skill is

An agent skill is a folder with a `SKILL.md` file in it. The file starts with a short frontmatter block, at minimum a `name` and a `description`, followed by instructions written for the agent. A skill can also carry reference files, scripts and assets that the instructions point to.

The clever part is how little of it the agent reads up front. The Agent Skills format uses progressive disclosure:

1. **Discovery.** When a session starts, the agent loads only the name and description of each installed skill. Anthropic puts this at roughly 100 tokens per skill, so installing ten skills costs almost nothing.
2. **Activation.** When a task matches a skill's description, the agent reads the full `SKILL.md` into its context.
3. **Execution.** The agent follows the instructions and opens the bundled reference files only when it needs them.

![A coding task matched against skill descriptions, then the full SKILL.md loaded and its rules and checks applied](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-how-an-agent-picks-up-a-skill-technical-illustration-2.webp)

That is why the description matters so much. It has to say both what the skill does and when to use it, because it is the only part the agent sees before deciding.

Because `SKILL.md` is an open format, the same skill works in any agent that supports it. Installing one is a single command with the open-source `skills` CLI from Vercel Labs, which copies the skill into the folder your agent reads:

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet
```

Leave out `--skill` to choose from the list, or install all ten at once.

## Why we package our standards as skills

Every ARG skill comes from a real codebase: a reference solution, a boilerplate or a production product we maintain. While turning them into skills we found the same thing each time. Parts of the original had aged, and some rules only existed in people's heads.

So each skill follows two principles:

- **A rule needs a check.** Where we can, the rule is backed by something that fails the build: an architecture test, an Nx boundary tag, a lint rule. An agent can misread a sentence. It cannot argue with a red pipeline.
- **One workflow everywhere.** One branch per change, a reviewed pull request with a Conventional Commit title, CI before merge, and versioned releases. Every skill applies it, so the agent's output arrives in the same shape as a teammate's.

The three back-end skills below apply those principles to three different jobs.

## ARG .NET: a rich domain on the current LTS

**What goes wrong without it.** Agents flatten .NET solutions. Business rules leak into controllers, exceptions become control flow, and tests mock the database so thoroughly that they prove nothing about real writes.

**What the skill makes the agent do.** The solution is split into Domain, Application, Infrastructure and API projects, and NetArchTest architecture tests fail the build when a dependency points the wrong way. Entities and value objects hold the business rules and return explicit `Result` values instead of throwing, and failures become consistent `ProblemDetails` responses at the API edge.

Each feature is one command or query with its own handler and validator, a vertical slice. Domain events go through a [transactional outbox](/patterns/transactional-outbox/), so an event is never lost and never published for a transaction that failed. Integration and functional tests run against real databases in containers with Testcontainers.

![ASP.NET Core layers guarded by architecture tests, and a domain event saved to an outbox in the same transaction](/images/blog/agent-skills-part-1-dotnet-nx-mcp-backend/agent-skills-dotnet-layers-and-outbox-technical-illustration-3.webp)

**Where it came from.** The skill is distilled from our .NET reference solution, a booking platform built with domain-driven design, CQRS, an outbox, Keycloak authentication and Testcontainers. Three things in it had aged: it targeted .NET 8, it relied on MediatR, which is now commercially licensed, and it serialized the outbox in an unsafe way. The skill fixes all three, targets the current LTS, and asks you which mediator option you want. If you want to drop the mediator entirely, our guide to [CQRS without MediatR](/blog/cqrs-without-mediatr/) shows the plain-interface version.

**When it kicks in.** Scaffolding or extending a solution; adding an entity, value object, domain event, command, query, handler, repository or endpoint; configuring EF Core, authentication, caching or health checks; writing unit, architecture or integration tests; setting up CI and Docker.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet
```

Full details: [ARG .NET skill](/skills/arg-dotnet/).

## ARG Nx Monorepo: many services, one workspace

**What goes wrong without it.** Monorepos make it easy to import anything from anywhere, and agents take the shortest path. Within a few weeks, application code imports infrastructure, services read each other's tables, and CI rebuilds the whole workspace on every change.

**What the skill makes the agent do.** It runs NestJS microservices and a Next.js front end in one Nx and pnpm workspace. Each service covers one business area and owns its own data and schema; no service reads another's tables, which is the [database per service](/patterns/database-per-service/) pattern. Domain, application and infrastructure code live in separate Nx libraries with tags, and Nx enforces which library may import which on every build.

Services talk through asynchronous messages on Kafka or RabbitMQ with versioned contracts. An outbox makes sure no message is lost when a write succeeds, and consumers are safe to run twice. Commands and queries are separated and return explicit `Result` types. CI uses `nx affected` to build and test only what changed, and every deployable app gets its own Docker image and version.

**Where it came from.** Our [Nx and NestJS monorepo boilerplate](/blog/nx-nestjs-monorepo-boilerplate/). Reviewing it, we found the problems that creep into most monorepos: boundaries nobody enforced, application code importing infrastructure, thin tests, and CI that rebuilt everything. Each of those is now an explicit rule with a check behind it.

**When it kicks in.** Scaffolding or extending the workspace; adding an app, library, service, command, query, repository or message consumer; choosing between Kafka and RabbitMQ; naming services, topics and queues; setting up CI, Docker images and releases.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-nx-monorepo
```

A skill that sets up microservices does not settle whether you need them. That decision deserves its own evidence, which is what our piece on [microservices vs a modular monolith](/blog/microservices-vs-modular-monolith-prove-it-before-you-split/) is about. Full details: [ARG Nx Monorepo skill](/skills/arg-nx-monorepo/).

## ARG MCP Server: your app, usable by agents

**What goes wrong without it.** Asked to "add MCP support", an agent tends to write a second back end: new tools with their own queries, their own permission checks and their own error handling. Within a month, the REST API and the agent interface disagree about who may do what.

**What the skill makes the agent do.** It starts by mapping what agents need to do onto the use cases your application already has. Each MCP tool calls exactly one use case, with the same permissions and errors as your REST API. The MCP server is a thin entry point next to the API, and architecture checks keep business logic and permission checks out of it, so the two interfaces grow together.

Remote servers are secured with OAuth, following the MCP authorization spec, and agents receive clear, typed errors instead of stack traces. Local servers run over stdio with no network exposure. The server is tested with a real MCP client, and the skill writes setup instructions for Claude Code, Claude Desktop, Cursor, VS Code, Codex and OpenCode.

**Where it came from.** Our NestJS MCP starter, where a REST API, an MCP server and a background worker share one application layer. The approach applies to any Node.js or TypeScript back end.

**When it kicks in.** Adding MCP support to an API, making an app usable from AI assistants, exposing use cases to agents, choosing between stdio and HTTP transport, adding OAuth to a remote server, or testing and documenting an MCP server.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-mcp-server
```

Full details: [ARG MCP Server skill](/skills/arg-mcp-server/).

## What the three have in common

Look past the stacks and the pattern is the same. Business rules sit in their own layer. Boundaries are enforced by a tool, not by memory. Writes that publish events go through an outbox. Tests touch real infrastructure where it matters. Every change travels through the same branch, review and release workflow.

That consistency is the point. An agent with these skills installed does not just write code that works. It writes code that looks like the rest of the codebase, which is what keeps a system easy to change a year later.

Next up: [Part 2: Front End Skills That Keep Agents on Our Patterns](/blog/agent-skills-part-2-angular-react-native-browser-extension/), covering Angular, React Native and browser extensions.

## FAQ

- **What is a SKILL.md file?** It is the required file in an agent skill folder. It holds a `name` and a `description` in its frontmatter, followed by instructions for the agent, and can point to bundled reference files and scripts.
- **How do I install a Claude Code skill?** Run `npx skills add` with the repository and skill name, for example `npx skills add ARG-Software/arg-agent-skills --skill arg-dotnet`. The CLI copies the skill into the folder your agent reads.
- **Do agent skills work with Cursor, Codex and Copilot?** Yes. `SKILL.md` is an open format, and the ARG skills work with any agent that supports it, including Claude Code, Cursor, Codex, OpenCode and Copilot.
- **Do installed skills fill up the context window?** Barely. Agents load only each skill's name and description at startup, and read the full instructions only when a task matches.

## Sources

- [Agent Skills: Overview](https://agentskills.io/)
- [Agent Skills: Specification](https://agentskills.io/specification)
- [Anthropic: Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Vercel Labs: skills, the open agent skills tool](https://github.com/vercel-labs/skills)
- [Model Context Protocol: Specification](https://modelcontextprotocol.io/specification)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
