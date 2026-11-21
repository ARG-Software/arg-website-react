---
seoTitle: Microservices vs Modular Monolith: Prove It Before You Split
slug: microservices-vs-modular-monolith-prove-it-before-you-split
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: Architecture
tags: Architecture, Backend
title: The Monolith Isn't Your Problem: What to Prove Before You Reach for Microservices
subtitle: Microservices vs. modular monolith is an evidence question. Learn when to use microservices, what proof to bring, and the cheaper fix to try first.
intro: Microservices vs. modular monolith is an evidence question. Learn when to use microservices, what proof to bring, and the cheaper fix to try first.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 9 min read
---

![A monolith block cut into four modules, with three split out as separate microservices for data, jobs and commands](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-prove-it-before-you-split-header.webp)

Most microservice migrations we got called into were not decided in an architecture review. They were decided in meetings, with a slide that showed a couple of boxes on the left and a tidy row of services on the right.

The result arrives later, in production. A checkout that used to fail with one clear stack trace now fails somewhere between three services and a queue. A report that was a single SQL query is now four HTTP calls and a cache service. The team is bigger, the cloud invoice is bigger, and features ship slower than before.

None of this means microservices are wrong. It means a split is a trade, not an upgrade. You give up the simplicity of a function call and get independent deployment and scaling in return. That trade is worth it when you can prove that you need what you are buying.

## The cost

Moving code behind a network boundary changes the physics of the system. Four things show up every time:

![The same orders-to-billing call inside a monolith and between two microservices, with the costs the network adds](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-cost-nobody-puts-on-the-slide-technical-illustration-2.webp)

- **Latency.** An in-process call takes nanoseconds. A network call takes milliseconds, and a request that spreads out to five services pays that cost five times, or waits on the slowest one.
- **Partial failure.** In a single process, the call either works or fails. Over the network, it can time out, succeed without telling you, or succeed twice. Every call needs a decision about retries, timeouts, and fallbacks.
- **Consistency.** One database transaction becomes several. Keeping them in agreement takes patterns like the [saga](/patterns/saga/) and the [transactional outbox](/patterns/transactional-outbox/), and the business has to accept that some data will be briefly out of date.
- **Debugging.** A bug that used to live in one log file is now spread across services. Without distributed tracing, finding it is guesswork.

Martin Fowler calls this the microservice premium: a real cost in complexity that only pays off once a system is too complex to manage as a monolith. The useful question is never "are microservices good?" It is "do we have a problem that justifies the premium?"

## Evidence vs excuses

Here are the reasons teams give for splitting. Each one can be a real motive or an excuse. For each, we list what an excuse sounds like, what real evidence looks like, and what to try first, because there is almost always a cheaper fix.

![Table of the five reasons to split into microservices, with the excuse, the evidence to bring and the fix to try first](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-evidence-vs-excuses-technical-illustration-3.webp)

### 1. Load

**The excuse:** "It won't scale." Usually said before anyone has measured anything.

**The evidence:** Metrics that show one part of the system with a resource profile very different from the rest. An image pipeline that needs GPUs while the API needs none. A pricing engine that eats memory and forces you to size every instance for its peak. An import job whose traffic spikes are a hundred times the baseline. The proof is a dashboard or a profiler trace, not a prediction.

**Try this first:** Run more instances of the monolith behind a load balancer. Move heavy work to a background worker, which runs from the same codebase but on separate instances. A worker process deployed from the monolith gives you most of the independent scaling with none of the network contracts.

### 2. People

**The excuse:** "The code is a mess." Tangled code split into services is still tangled code, now with network calls in between.

**The evidence:** Data showing that teams are blocking each other. DORA's software delivery metrics are a good lens here: if changes take longer to reach production and deployments get less frequent because teams wait on each other, that is a signal.

Look for release trains, where everyone bundles their work onto a fixed schedule because nobody can ship alone, along with code freezes, merge queues that take days, and urgent fixes stuck behind someone else's unfinished work.

This comes down to Conway's Law, Melvin Conway's 1968 observation that software tends to mirror the communication structure of the organization that builds it. If you have a few teams owning distinct parts of the business, lining up your services with those teams cuts down on back-and-forth. If it's just one team of four people, splitting things up doesn't solve anything.

**Try this first:** Give each team ownership of a module, enforce it with a `CODEOWNERS` file and architecture tests, and use feature flags so unfinished work can merge without being released. Many "we need microservices" conversations end once teams stop stepping on each other inside the same repository.

### 3. Data

**The excuse:** "It's a separate domain." It may be on paper, but the database often disagrees.

**The evidence:** Proof that the candidate service's tables stand alone. Pull the query logs and look for joins that cross the proposed boundary. Check which modules write to which tables. If orders and invoicing read each other's tables in every query, they are not two services. Splitting them turns each join into an API call and each transaction into a distributed one.

![Modules that own their tables versus modules joined across the boundary, not ready for microservices](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-data-boundary-technical-illustration-4.webp)

A real service owns its data, which is the core of the [database per service pattern](/patterns/database-per-service/). Nobody else reads its tables, not even for a quick report. If you cannot draw that line in the current schema, you cannot draw it with a network either.

**Try this first:** Keep everything in the same database, but put each module's data in its own schema and make a rule that modules can't query each other's tables directly. If that runs smoothly for a few months, the separation works. If developers keep asking for exceptions to reach across schemas, those two parts of the app are still too tangled to separate, and it is much cheaper to find that out with a simple rule now than after you've built separate services.

### 4. Isolation

**The excuse:** "Isolation is good." True in general, and useless as a reason.

**The evidence:** A concrete rule that applies to only one part of the system. Payments must keep running when reporting goes down. Card data must be isolated so compliance audits are smaller and quicker. A partner integration needs to be deployed weekly, while the core product deploys monthly. A reason only counts if a real stakeholder, like compliance, legal, or a specific client, actually needs it, rather than engineers inventing "what if" scenarios.

**Try this first:** Most availability problems can be handled inside a single application by isolating resources per module (separate connection pools and timeouts) and putting a [circuit breaker](/patterns/circuit-breaker/) around third-party dependencies so failures don't spread. Compliance is the case where splitting a module into its own service usually makes sense, because auditors care about a strict, physical boundary around sensitive data.

### 5. Platform readiness

**The excuse:** "Spinning up a separate service is quick and easy, we're already on the cloud, and we can add monitoring later." Underestimating the setup cost is how teams get burned, and "later" usually means after the first major outage nobody can figure out.

**The evidence:** You already have the underlying platform, or months of engineering time budgeted to build it, before your first separate service goes live. That means independent deployment pipelines for each service, centralized logs, distributed tracing to follow requests across services, a message broker, and safeguards so messages don't get lost or duplicated: the outbox, [idempotent consumers](/patterns/idempotent-consumer/) and retries with backoff. Our guide to [debugging slow microservices with Prometheus and OpenTelemetry](/blog/debug-microservices-prometheus-opentelemetry/) shows what the observability part takes on its own.

Teams that skip this groundwork don't get a simpler version of microservices. They get a distributed monolith: everything still deploys together, one failure takes down everything else, and debugging becomes a nightmare.

**Try this first:** Build those monitoring and messaging tools inside your existing app first. Structured logging, request tracing, and an outbox make a single application much easier to run today. And if you ever do split things up later, the hard infrastructure work is already out of the way.

## The split ladder

Splitting is not a single decision. It is a ladder, and you climb one step at a time, only as far as your evidence takes you.

![Five steps from folders to modules, schemas, one service and more microservices; most systems stop at a modular monolith](/images/blog/microservices-vs-modular-monolith-prove-it-before-you-split/microservices-vs-modular-monolith-the-split-ladder-technical-illustration-5.webp)

1. **Folders.** Code grouped by business area instead of by technical layer. Free, and it shows you where the seams are.
2. **Enforced modules.** Each module exposes a small public API and hides the rest. Architecture tests fail the build when one module reaches into another. This is where a modular monolith begins.
3. **Schema per module.** Each module owns its tables. Other modules get data through the owner's API or through events, never through a join.
4. **One extracted service.** The module with the strongest evidence moves out. It runs in production long enough for the team to learn what operating a service really costs.
5. **More services.** Only when the first extraction has paid off and the next candidate has its own evidence.

Most teams can stop at step two or three. You get clear owners and real boundaries, and you can still split later if you need to. Shopify did exactly this: they kept one big Rails app with one deploy and drew hard lines between its parts instead of breaking it into services.

If you do get to step four, don't move everything at once. Build the new service next to the old code and move features over one by one until the old part is empty. Fowler calls this the strangler fig. It's much easier if you do steps two and three first, because the boundary already exists. You're just moving it.

## Microservices vs. modular monolith: what the record shows

The pattern is consistent. Fowler's Monolith First note points out that almost every successful microservice system he heard of started as a monolith that grew too big and was then broken up, while systems designed as microservices from day one often ran into serious trouble. The teams that succeed with services usually earned their boundaries inside a monolith first.

That is the real comparison. A modular monolith is not the option for teams that are not ready yet. It is the option that keeps your choices open, and for many products it is the final architecture.

## Before you split, write it down

Take the five reasons above and write one sentence of evidence for each: a metric, a log query, a named requirement, or a budget line. Where you cannot write that sentence, use the cheaper fix. Where you can, you have the start of a real case for a service and the order in which to extract.

If you want a second pair of eyes on where your boundaries really are, it is the kind of question we work through in an [architecture review](/audit/architecture-review/).

## FAQ

- **When should you use microservices instead of a monolith?** When you can show evidence for real drivers: parts of the system with very different load profiles, teams whose releases block each other, data that already stands apart, a specific isolation or compliance requirement, and a platform ready to run services. Without that evidence, a modular monolith is usually the better choice.
- **What is a modular monolith?** A single deployable application split into modules that own their code and data. Each module exposes a small public API, and architecture tests or separate schemas stop other modules from reaching into its internals.
- **Is a modular monolith better than microservices?** For most teams, yes, at least to start. It gives clear ownership and enforced boundaries without the latency, partial failure, and platform costs of a network boundary, and it keeps the option to extract services later.
- **How do you migrate a monolith to microservices?** One step at a time. First enforce module boundaries and give each module its own schema, then extract the module with the strongest evidence, using the strangler fig approach to move behavior gradually. Run it in production before extracting the next one.

## Sources

- [Martin Fowler: Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html)
- [Martin Fowler: Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Martin Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Melvin E. Conway: How Do Committees Invent?](https://www.melconway.com/Home/Committees_Paper.html)
- [DORA: DORA's software delivery performance metrics](https://dora.dev/guides/dora-metrics-four-keys/)
- [Shopify Engineering: Deconstructing the Monolith: Designing Software that Maximizes Developer Productivity](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
