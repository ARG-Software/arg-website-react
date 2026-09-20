---
seoTitle: AI Architectural Changes Nobody Wants
slug: ai-architectural-changes-nobody-wants
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture
title: Everyone Wants AI. Nobody Wants the Architectural Changes It Requires.
subtitle: AI fails in production when systems aren’t designed for probabilistic behavior, data pipelines, and change. Architecture is the way.
intro: AI fails in production when systems aren’t designed for probabilistic behavior, data pipelines, and change. Architecture is the way.
date: December 18, 2025
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 11 min read
mediumUrl: https://arg-software.medium.com/everyone-wants-ai-nobody-wants-the-architectural-changes-it-requires-%EF%B8%8F-2e049dd91dbf
---

![Everyone wants AI](/images/blog/everyone-wants-ai/everyone-wants-ai-header.webp)

Everyone seems to want AI in their product. Automated decisions. Smarter workflows. Predictive insights. Competitive advantage.

What far fewer teams want is the architectural work that makes AI viable in production.

The demand is real: Stanford's [2026 AI Index](https://hai.stanford.edu/ai-index/2026-ai-index-report) reports organizational AI adoption at 88%. It also reports 362 documented AI incidents in 2025, up from 233 in 2024, while responsible-AI benchmark reporting among leading model developers remains uneven. Adoption and production readiness are not the same thing.

My argument in this article is architectural, not statistical: many failures I see after a convincing demo come from treating model integration as an API task instead of a system change. That will not be true of every project. The right amount of architecture depends on impact, reversibility, traffic, data sensitivity, and regulation.

## The Illusion: AI Is a Feature You Can Add

Most AI conversations start with a feature mindset: “We’ll just plug a model into our existing system.”

Sometimes that is enough for an experiment. It is rarely the whole production design.

An AI model is an external or internally hosted dependency with unusual properties: outputs may vary, quality is distribution-dependent, behavior changes with model and prompt versions, and operational risk often sits outside the application's codebase. Predictive models, generative models, and agents do not have identical failure modes, but none should be treated as a perfectly stable function.

Trying to bolt that onto a CRUD flow without naming those properties is where things break.

## The First Collision: Your Data Is Not AI-Ready

AI systems are constrained by the data and context they consume. Production data is often optimized for transactions rather than training, retrieval, or evaluation. It may be distributed across services, lack ownership or provenance, lose historical context, or use the same field to mean different things over time.

Training, retrieval, and inference pipelines need data contracts appropriate to their use: provenance, lawful access, quality checks, versioning, and enough context to interpret a value. The [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) treats risk management as work across design, development, use, and evaluation, not as a one-time model check.

Before - mutable data with no audit history:

```typescript
async updateUser(userId: string, changes: Partial<User>) {
    const user = await this.db.findById(userId);
    Object.assign(user, changes);  // What changed? When? Why?
    await this.db.save(user);
}
```

One possible improvement - update the operational record and publish a versioned domain event through a transactional outbox:

```typescript
async updateUser(userId: string, changes: UserChanges) {
    await this.db.transaction(async tx => {
        const user = await tx.users.findById(userId);
        user.apply(changes);
        await tx.users.save(user);
        await tx.outbox.append({
            type: 'USER_UPDATED',
            schemaVersion: 2,
            aggregateId: userId,
            occurredAt: new Date().toISOString(),
            data: changes
        });
    });
}
```

Event sourcing is not a prerequisite for AI, and “immutable” does not automatically mean complete, correct, or legally retainable forever. Depending on the use case, change-data capture, temporal tables, versioned snapshots, feature stores, or curated retrieval documents may be better.

The architectural requirement is traceability and reproducibility: know which data, schema, prompt, model, policy, and code produced a result.

## The Second Collision: Synchronous Thinking

Many existing systems are built around synchronous request/response flows. Some AI fits that model: autocomplete, classification, and streamed chat can be interactive. Long-running analysis, tool-using agents, batch inference, and human review often do not.

The problem - a long-running task holds the request open and has no durable state:

```typescript
app.post('/api/analyze', async (req, res) => {
    const result = await aiModel.predict(req.body);
    res.json(result);
});
```

For a long-running or retryable workload, accept a job and expose its status:

```typescript
app.post('/api/analyze', async (req, res) => {
    const jobId = await queue.enqueue({
        type: 'AI_INFERENCE',
        data: req.body
    });

    res.status(202).json({
        jobId,
        status: 'processing',
        statusUrl: `/api/jobs/${jobId}`
    });
});

worker.on('AI_INFERENCE', async job => {
    const result = await aiModel.predict(job.data, { idempotencyKey: job.id });
    await jobs.complete(job.id, result);
});
```

The architectural fix is not “always async.” It is matching the interaction to the latency and failure model. Interactive paths need timeouts, cancellation, streaming where useful, and graceful fallback. Durable jobs need idempotency, retries with limits, explicit states, dead-letter handling, and a way for users to resume or inspect the result.

## The Third Collision: Determinism vs. Probability

Traditional business rules can enforce exact invariants. AI outputs are usually estimates or generated artifacts, and even low-temperature inference can change across model versions or provider infrastructure. Traditional distributed systems are not perfectly deterministic either; the difference is that output quality itself becomes a runtime concern.

Traditional - predictable and bounded:

```typescript
function calculateDiscount(user: User): number {
    if (user.loyaltyTier === 'gold') return 0.20;
    if (user.loyaltyTier === 'silver') return 0.10;
    return 0.0;
}
```

AI-assisted decision - validate the proposal before applying a deterministic policy:

```typescript
async function calculateDynamicDiscount(user: User): Promise<number> {
    const proposal = await model.proposeDiscount(user.toFeatures());

    if (!proposal.schemaValid || proposal.modelVersion !== approvedModelVersion) {
        return calculateDiscount(user);
    }

    return pricingPolicy.clamp(proposal.discount);
}
```

Confidence scores can help when they are defined and calibrated, but an LLM saying “0.93 confident” is not automatically a calibrated probability. Architectures need model and policy version awareness, output validation, fallback paths, evaluation thresholds, and human review where the consequence justifies it. Hard business invariants should remain deterministic.

NIST's [Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) names confabulation, data privacy, information security, and human-AI configuration among the risks organizations should manage. That is a stronger basis for design than assuming one generic confidence threshold solves the problem.

## The Fourth Collision: Observability Stops at the Code Boundary

Application logs, metrics, and traces answer whether a call completed. They do not answer whether the model result was useful, grounded, fair enough for the use case, or drifting away from the evaluation set.

Traditional - did the request work or fail?

```typescript
try {
    const result = await model.predict(image);
    metrics.increment('classification.success');
} catch (error) {
    metrics.increment('classification.error');
}
```

AI-aware - what ran, on which data, and how can we assess it?

```typescript
const result = await model.predict(image);

metrics.histogram('input.image_size', image.length);
metrics.histogram('output.confidence', result.confidence);
metrics.histogram('inference.latency_ms', result.latencyMs);
metrics.tag('model_version', result.modelVersion);
metrics.tag('prompt_version', prompt.version);
metrics.tag('dataset_version', features.version);

evaluationQueue.sample({ input: image.reference, output: result.label });
```

Not every application needs online drift detection, and brightness is not a useful proxy for every vision model. Choose signals tied to known failure modes: latency, token and tool cost, retrieval quality, refusal rate, schema violations, groundedness, subgroup performance where lawful and relevant, user correction, and sampled human evaluation. Keep sensitive inputs out of telemetry unless there is a justified, protected need.

The [Google Cloud MLOps guidance](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) describes monitoring, validation, metadata management, and automated pipelines as parts of production ML maturity. The vendor is not neutral about its own platform, but those lifecycle concerns are provider-independent.

## The Fifth Collision: Security, Privacy, and Compliance

AI systems can introduce external model providers, vector stores, tool calls, large data movement, and new identity boundaries. Generative systems add prompt injection, sensitive-information disclosure, improper output handling, excessive agency, vector weaknesses, misinformation, and unbounded consumption to the threat model. Those are all categories in the [OWASP Top 10 for LLM and Generative AI Applications 2025](https://genai.owasp.org/llm-top-10/).

Insecure - sending an entire customer object to an external service:

```typescript
async function analyzeCustomer(customerId: string) {
    const customer = await db.getCustomer(customerId);
    return externalAI.analyze(customer); // Name, email, SSN, and everything else.
}
```

Safer - minimize and pseudonymize before sending, then enforce the same rule at the provider boundary:

```typescript
async function analyzeCustomer(customerId: string) {
    const customer = await db.getCustomer(customerId);

    const minimized = {
        ageBucket: getAgeBucket(customer.age),
        region: customer.region,
        purchaseFrequency: customer.purchaseCount
        // Direct identifiers removed; re-identification risk still needs assessment.
    };

    await auditLog.record({
        action: 'EXTERNAL_AI_CALL',
        customerId,
        dataSent: Object.keys(minimized),
        provider: 'approved-provider',
        purpose: 'purchase-frequency-analysis'
    });

    return approvedAI.analyze(minimized, {
        retention: 'none',
        trainingUse: 'disabled'
    });
}
```

Removing names and emails is not necessarily anonymization. Age buckets, region, and behavior can still identify someone when combined with other data. Data minimization, purpose limitation, access control, retention, regional processing, contractual terms, deletion paths, and threat modelling all belong in the design.

For teams operating in Europe, this is also no longer a future concern. As of this review, the [EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) became generally applicable on August 2, 2026, with phased exceptions. Its requirements depend on the system's role and risk category; high-risk timelines were amended in July 2026.

This article is engineering guidance, not legal advice, but architecture now has to preserve the documentation, logs, human oversight, and transparency a system may be required to demonstrate.

## What Architectural Change Actually Looks Like

Teams do not always need a rewrite. They need explicit seams around the parts that can change or fail differently.

Pattern 1 - a capability boundary, not a “universal model” wrapper:

```typescript
interface DocumentSummarizer {
    summarize(input: DocumentRef, policy: SummaryPolicy): Promise<SummaryResult>;
}

const result = await summarizer.summarize(document, approvedPolicy);
```

Providers are not drop-in equivalents: context limits, tool semantics, safety behavior, structured output, latency, price, and data terms differ. A capability-specific port keeps business code independent while making those differences testable instead of hiding them behind `any`.

Pattern 2 - explicit state for durable or reviewable workflows:

```typescript
enum AIState {
    SUBMITTED = 'submitted',
    PROCESSING = 'processing',
    NEEDS_REVIEW = 'needs_review',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

class AIWorkflow {
    async transition(newState: AIState) {
        if (!this.canTransition(this.currentState, newState)) {
            throw new Error('Invalid transition');
        }

        this.currentState = newState;
        await this.emitStateChange();
    }
}
```

Other patterns become useful according to risk: versioned datasets and prompts, evaluation suites in delivery pipelines, retrieval provenance, bounded tool permissions, human approval gates, audit records, kill switches, rate and cost limits, and graceful degradation.

None of this is glamorous. Not all of it is necessary for every system. The discipline is to select controls from the actual failure modes rather than from an AI architecture checklist. NIST's [AI RMF Playbook](https://airc.nist.gov/airmf-resources/playbook/) makes the same point explicitly: its suggestions are voluntary and are not a checklist to follow in full.

## Why Teams Resist This Work

Because architectural change is slower than demos, harder to sell internally, often invisible to stakeholders, and uncomfortable for existing systems.

My view: skipping controls that match a known risk rarely removes the cost. It moves that cost into incidents, manual review, customer support, or a later redesign. A low-risk experiment may reasonably accept that trade; a consequential production decision should not do so silently.

## The Real Question

The real question is not only “How do we add AI?” It is “What can this system get wrong, who bears the consequence, and can our architecture detect, contain, explain, and reverse it?”

I expect AI to keep exposing weak data ownership, unclear service boundaries, missing telemetry, and fragile vendor dependencies. That is a prediction, not a law: some narrow AI features will remain simple and low-risk.

## Final Thought

AI does not replace architectural discipline. It asks more of it.

Teams can start with a feature. Systems last when teams also treat model behavior, data, evaluation, security, cost, and change as architectural concerns.

That is the difference between an experiment that teaches you something and a production system you can operate responsibly.

What architectural challenges have you faced when integrating AI into production systems?

## Sources reviewed

- [Stanford HAI, 2026 AI Index Report](https://hai.stanford.edu/ai-index/2026-ai-index-report) - adoption, incidents, capability, and responsible-AI reporting trends;
- [NIST AI Risk Management Framework 1.0](https://www.nist.gov/itl/ai-risk-management-framework) and [NIST AI 600-1, Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) - lifecycle risk management and generative-AI risk categories;
- [NIST AI RMF Playbook](https://airc.nist.gov/airmf-resources/playbook/) - voluntary, use-case-specific Govern, Map, Measure, and Manage practices;
- [NIST AI 100-2, Adversarial Machine Learning taxonomy](https://doi.org/10.6028/NIST.AI.100-2e2023) - attack and mitigation terminology across the AI lifecycle;
- [OWASP Top 10 for LLM and Generative AI Applications 2025](https://genai.owasp.org/llm-top-10/) - application-security risks for generative systems;
- [Google Cloud, MLOps: Continuous delivery and automation pipelines in machine learning](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) - production ML validation, metadata, automation, and monitoring patterns;
- [European Commission, AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) and [current consolidated Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng) - applicability, risk categories, transparency, governance, and amended implementation timeline.
