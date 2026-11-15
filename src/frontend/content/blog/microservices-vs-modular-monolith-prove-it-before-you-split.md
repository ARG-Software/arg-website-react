---
seoTitle: Microservices vs Modular Monolith: Prove It Before You Split
slug: microservices-vs-modular-monolith-prove-it-before-you-split
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: Architecture
tags: Architecture, Microservices, Backend
title: The Monolith Isn't Your Problem: What to Prove Before You Reach for Microservices
subtitle: Microservices vs modular monolith is an evidence question. Learn when to use microservices, what proof to bring, and the cheaper fix to try first.
intro: Microservices vs modular monolith is an evidence question. Learn when to use microservices, what proof to bring, and the cheaper fix to try first.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 9 min read
---

![A monolith block cut into four modules, with three split out as separate microservices for data, jobs and commands](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-prove-it-before-you-split-header.webp)

Most microservice migrations we get called into were not decided in an architecture review. They were decided in a meeting, usually with a slide that showed a tangle of boxes on the left and a tidy row of services on the right.

The bill arrives later, in production. A checkout that used to fail with one clear stack trace now fails somewhere between three services and a queue. A report that was a single SQL query is now four HTTP calls and a cache nobody trusts. The team is bigger, the cloud invoice is bigger, and features ship slower than before.

None of this means microservices are wrong. It means a split is a trade, not an upgrade. You give up the simplicity of a function call and get independent deployment and scaling in return. That trade is worth it when you can prove you need what you are buying. This article is about what that proof looks like.

## The cost nobody puts on the slide

Moving code behind a network boundary changes the physics of the system. Four things show up every time:

![The same orders-to-billing call inside a monolith and between two microservices, with the costs the network adds](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-cost-nobody-puts-on-the-slide-technical-illustration-2.webp)

- **Latency.** An in-process call takes nanoseconds. A network call takes milliseconds, and a request that fans out to five services pays that cost five times, or waits on the slowest one.
- **Partial failure.** In a single process, the call either works or throws. Over the network, it can time out, succeed without telling you, or succeed twice. Every call site needs a decision about retries, timeouts and fallbacks.
- **Consistency.** One database transaction becomes several. Keeping them in agreement takes patterns like the [saga](/patterns/saga/) and the [transactional outbox](/patterns/transactional-outbox/), and the business has to accept that some data will be briefly out of date.
- **Debugging.** A bug that used to live in one log file is now spread across services. Without distributed tracing, finding it is guesswork.

Martin Fowler calls this the microservice premium: a real cost in complexity that only pays off once a system is too complex to manage as a monolith. The useful question is never "are microservices good?" It is "do we have a problem that justifies the premium?"

## Evidence vs excuses

Here are the five reasons teams give for splitting. Each one can be a real driver or an excuse, and the difference is whether you can show evidence. For each, we list what an excuse sounds like, what real evidence looks like, and what to try first, because there is almost always a cheaper fix.

![Table of the five reasons to split into microservices, with the excuse, the evidence to bring and the fix to try first](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-evidence-vs-excuses-technical-illustration-3.webp)

### 1. Load

**The excuse:** "It won't scale." Usually said before anyone has measured anything.

**The evidence:** Metrics that show one part of the system with a resource profile very different from the rest. An image pipeline that needs GPUs while the API needs none. A pricing engine that eats memory and forces you to size every instance for its peak. An import job whose traffic spikes are a hundred times the baseline. The proof is a dashboard or a profiler trace, not a forecast.

**Try this first:** Run more instances of the monolith behind a load balancer. Add caching on the hot reads. Move heavy work to a background worker that runs from the same codebase but on separate machines. A worker process deployed from the monolith gives you most of the independent scaling with none of the network contracts.

### 2. People

**The excuse:** "The code is messy." Messy code split into services is messy code with network calls in between.

**The evidence:** Delivery data showing that teams block each other. DORA's software delivery metrics are a good lens here: if change lead time keeps growing and deployment frequency keeps falling because releases wait on other teams, that is a signal. Look for release trains, code freezes, merge queues measured in days, and hotfixes held back by someone else's half-finished feature.

This is Conway's Law at work. Melvin Conway observed in 1968 that systems end up mirroring the communication structure of the organisation that builds them. If you have several teams with clear business areas, service boundaries that match those teams can reduce coordination. If you have one team of six people, there is nobody to decouple from.

**Try this first:** Give each team ownership of a module, enforce it with a `CODEOWNERS` file and architecture tests, and use feature flags so unfinished work can merge without being released. Many "we need microservices" conversations end once teams stop stepping on each other inside the same repository.

### 3. Data

**The excuse:** "It's a separate domain." It may be on the whiteboard. The database often disagrees.

**The evidence:** Proof that the candidate service's tables stand alone. Pull the query logs and look for joins that cross the proposed boundary. Check which modules write to which tables. If orders and invoicing read each other's tables in every second query, they are not two services. Splitting them turns each join into an API call and each transaction into a distributed one.

![Modules that own their tables versus modules joined across the boundary, not ready for microservices](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-data-boundary-technical-illustration-4.webp)

A real service owns its data outright, which is the core of the [database per service pattern](/patterns/database-per-service/). Nobody else reads its tables, not even for a quick report. If you cannot draw that line in the current schema, you cannot draw it with a network either.

**Try this first:** Give each module its own schema inside the same database and forbid cross-schema queries. If the module survives that for a few months, the boundary is real. If the team keeps asking for exceptions, you have learned something cheaply.

### 4. Blast radius and compliance

**The excuse:** "Isolation is good." True in general, and useless as a reason.

**The evidence:** A named requirement that one part of the system has and the rest does not. Payments must keep working when reporting is down. Card data must sit inside a PCI DSS scope, and the audit gets cheaper the smaller that scope is. A partner integration needs to ship weekly while the core product ships monthly. If you can write the requirement down and point to who asked for it, it counts.

**Try this first:** Bulkheads inside the monolith (separate thread pools, connection pools and timeouts per module) and a [circuit breaker](/patterns/circuit-breaker/) around fragile dependencies cover a lot of availability concerns. Compliance scope is the case where extraction most often earns its keep, because the boundary itself is what the auditor cares about.

### 5. Platform readiness

**The excuse:** "We'll add tracing later." Later usually means after the first production incident nobody can explain.

**The evidence:** The platform already exists, or there is budgeted time to build it before the first service goes live. That means per-service build and deployment pipelines, centralised logs, distributed tracing, a message broker, and the reliability patterns that make messaging safe: outbox, [idempotent consumers](/patterns/idempotent-consumer/), retries with backoff. Our guide to [debugging slow microservices with Prometheus and OpenTelemetry](/blog/debug-microservices-prometheus-opentelemetry/) shows what the observability part takes on its own.

This is the entry fee, and it is paid in engineer months before any service delivers value. Teams that skip it do not get a lightweight version of microservices. They get a distributed monolith: every service deploys together, every failure cascades, and nothing can be debugged.

**Try this first:** Build the platform pieces the monolith can already use. Structured logging, tracing and an outbox help a single application too, and they turn a later extraction into an operations task instead of a research project.

## The split ladder

Splitting is not a single decision. It is a ladder, and you climb one rung at a time, only as far as your evidence takes you.

![Five steps from folders to modules, schemas, one service and more microservices; most systems stop at a modular monolith](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-split-ladder-technical-illustration-5.webp)

1. **Folders.** Code grouped by business area instead of by technical layer. Free, and it shows you where the seams are.
2. **Enforced modules.** Each module exposes a small public API and hides the rest. Architecture tests fail the build when one module reaches into another. This is where a modular monolith begins.
3. **Schema per module.** Each module owns its tables. Other modules get data through the owner's API or through events, never through a join.
4. **One extracted service.** The module with the strongest evidence moves out. It runs in production long enough for the team to learn what operating a service really costs.
5. **More services.** Only when the first extraction has paid off and the next candidate has its own evidence.

Most systems should stop at rung two or three. They get clear ownership, enforced boundaries and the option to split later, without paying the network premium. Shopify took this route with its large Rails codebase: one codebase and one deployment, with strict boundaries between components, because a move to microservices would have added deployment, latency and refactoring costs they did not need.

When you do reach rung four, extract gradually. Fowler's strangler fig approach builds the new service alongside the old code and moves behaviour across piece by piece, instead of attempting a rewrite and a big switchover. The enforced modules from rungs two and three are what make this practical: if the boundary already holds inside the monolith, moving it behind a network is mostly mechanical.

## Microservices vs modular monolith: what the record shows

The pattern is consistent. Fowler's MonolithFirst note points out that almost every successful microservice system he heard of started as a monolith that grew too big and was then broken up, while systems designed as microservices from day one often ran into serious trouble. The teams that succeed with services usually earned their boundaries inside a monolith first.

That is the real comparison. A modular monolith is not the option for teams that are not ready yet. It is the option that keeps your choices open, and for many products it is the final architecture.

## Before you split, write it down

Take the five drivers above and write one sentence of evidence for each. A metric, a log query, a named requirement, a budget line. Where you cannot write that sentence, use the cheaper fix. Where you can, you have the start of a real case for a service, and the order in which to extract.

If you want a second pair of eyes on where your boundaries really are, it is the kind of question we work through in an [architecture review](/audit/architecture-review/).

## FAQ

- **When should you use microservices instead of a monolith?** When you can show evidence for real drivers: parts of the system with very different load profiles, teams whose releases block each other, data that already stands apart, a specific isolation or compliance requirement, and a platform ready to run services. Without that evidence, a modular monolith is usually the better choice.
- **What is a modular monolith?** A single deployable application split into modules that own their code and data. Each module exposes a small public API, and architecture tests or separate schemas stop other modules from reaching into its internals.
- **Is a modular monolith better than microservices?** For most teams, yes, at least to start. It gives clear ownership and enforced boundaries without the latency, partial failure and platform costs of a network boundary, and it keeps the option to extract services later.
- **How do you migrate a monolith to microservices?** One step at a time. First enforce module boundaries and give each module its own schema, then extract the module with the strongest evidence, using the strangler fig approach to move behaviour gradually. Run it in production before extracting the next one.

## Sources

- [Martin Fowler: Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html)
- [Martin Fowler: Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Martin Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Melvin E. Conway: How Do Committees Invent?](https://www.melconway.com/Home/Committees_Paper.html)
- [DORA: DORA's software delivery performance metrics](https://dora.dev/guides/dora-metrics-four-keys/)
- [Shopify Engineering: Deconstructing the Monolith: Designing Software that Maximizes Developer Productivity](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
