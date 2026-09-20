---
seoTitle: The Word Sabotaging Your Engineering Team
slug: the-word-sabotaging-your-engineering-team
author: Rui Rocha
authorUrl: https://www.linkedin.com/in/ruirochawork/
authorType: Person
authorSameAs: https://www.linkedin.com/in/ruirochawork/
tag: Engineering Culture
tags: Engineering Culture
title: The Four-Letter Word That's Sabotaging Your Engineering Team
subtitle: Stop using ‘just’ in engineering discussions. This four-letter word can reinforce false simplicity and pressure teams.
intro: Stop using ‘just’ in engineering discussions. This four-letter word can reinforce false simplicity and pressure teams.
date: June 18, 2025
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 7 min read
mediumUrl: https://arg-software.medium.com/the-four-letter-word-thats-sabotaging-your-engineering-team-adc398aed5ef
---

![The four letter word sabotage](/images/blog/the-four-letter-word/the-four-letter-word-header.webp)

In today's world of rapid development and AI-powered tools, it's easy to believe that anything can be done quickly - sometimes with a single prompt. But there's one small word that's quietly sneaking into engineering conversations and distorting that perception: "just."

It may sound harmless, but this simple word can shape expectations. It shows up in meetings, code reviews, and Slack threads, making complex work sound effortless - and nudging teams toward confusion, underestimation, and avoidable pressure:

- "Can't we just add a feature flag for this?"
- "Is it just a frontend styling issue?"
- "We could just refactor this service to use microservices"
- "Let's just migrate to the cloud this quarter"
- "Can't we just add two-factor auth to the existing flow?"

## The Hidden Problem with "Just"

When we use "just" in engineering contexts, we frame a proposed change as small before its scope has been examined. "Minimization bias" is not a standard diagnosis for this habit. The better-established concern is the planning fallacy: people often underestimate time, cost, and risk even when comparable work has run over before. Language does not create that bias by itself, but it can reinforce it.

### The Complexity Iceberg Effect

The word "just" makes any task sound simple and straightforward, even when it's not. Consider that "simple" feature flag addition:

- Feature flag infrastructure and management
- Experiment assignment and analytics, if the flag is used for A/B testing
- Analytics and monitoring setup
- Rollback strategies and kill switches
- Performance and availability impact in the evaluation path
- Security implications of flag exposure
- Long-term technical debt from flag accumulation

What appears as a single feature above the surface has an entire ecosystem of considerations beneath.

### Distance from the Implementation

"Just" often comes from people who cannot yet see the implementation constraints. Product managers say, "Just add a button," executives suggest to "just scale horizontally," and stakeholders wonder why we can't "just make it faster." That is a context gap, not a diagnosis of anyone’s competence. The cure is to surface the missing information.

### Psychological Safety Erosion

"Just" can suppress questions. If a task has already been labeled simple, a team member may worry that raising concerns will make them look incompetent. That weakens the healthy skepticism that helps prevent bugs, outages, and technical debt.

### The Planning Fallacy Multiplier

Software work is vulnerable to the planning fallacy. "Just" can compound it by pressuring teams to provide estimates that match the implied simplicity. Repeated often enough, the result can be missed commitments and burnout. Kahneman and Lovallo’s classic paper on [bold forecasts and narrow framing](https://doi.org/10.1287/mnsc.39.1.17) explains the broader cognitive problem; it does not establish that one word causes it.

## The Better Approach: Replace "Just" with Systems Thinking

Instead of using "just," practice assumption interrogation: actively question the premises behind a proposed solution before estimating it.

Instead of: "Can't we just add a feature flag for this?" — Try: "What's our strategy for managing feature flag lifecycle and preventing flag debt accumulation?"

Instead of: "Is it just a frontend styling issue?" — Try: "Have we confirmed this behavior is consistent across browsers, devices, and accessibility tools?"

Instead of: "We could just refactor this to microservices" — Try: "What distributed-systems costs are we prepared to take on, and do we have the operational maturity for independent deployment, observability, data consistency, and failure handling?"

Instead of: "Can't we just add two-factor auth?" — Try: "Which threats and assurance level are we addressing, can we offer phishing-resistant authentication, and how will enrollment, recovery, and accessibility work?" NIST’s current [digital identity guidance](https://pages.nist.gov/800-63-4/sp800-63b.html) treats those as parts of one authentication lifecycle, not a checkbox.

## Why This Approach Works Better

- **Activates Second-Order Thinking.** Questions force us beyond immediate solutions to consider downstream effects, dependencies, and unexpected consequences.
- **Builds More Resilient Systems.** By questioning assumptions upfront, we can design explicit responses to important failure modes.
- **Surfaces Hidden Dependencies.** Complex systems have critical properties. What seems simple often involves multiple dependencies that questions help to identify.
- **Prevents Technical Debt Accumulation.** Quick "just" solutions often become tomorrow's problems. Systems thinking identifies these debt patterns up front.
- **Cultivates Expertise Recognition.** Questions acknowledge that different team members have specialized knowledge in their domains.

## The Cognitive Science Behind "Just"

Research in cognitive psychology helps explain why minimizing language can be risky in technical contexts. It does not show that the word itself has a unique causal power.

**The Curse of Knowledge.** Once people know something, they can struggle to reconstruct the perspective of someone who does not. In engineering, "just" may hide a learning curve or prerequisite that has become invisible to the speaker. The effect was demonstrated in classic research on [information asymmetry and judgment](https://doi.org/10.1086/261651).

**Availability Heuristic.** Recent or memorable examples can carry too much weight. If the previous similar change went smoothly, that experience may dominate the estimate even when today’s dependencies differ.

**Optimism in Planning.** Teams can underestimate task duration and complexity. "Just" may make that optimism harder to challenge by making a proposed solution sound settled before discovery begins.

**Solution Fixation.** "Just" often introduces a solution, not a need: "just add a cache" skips the question of why the system is slow. Naming the desired outcome first keeps alternatives open.

## When "Just" Is Okay (Sort Of)

There are at least two useful uses of "just" - both involving self-awareness.

**Ironic Self-Deprecation.** Use it when you're jokingly pretending something is simple while knowing it's not: "Yeah, we can just build real-time collaboration… you know, like Google Docs did - with years of engineering and a team of PhDs."

**Bounded Context Acknowledgment.** When you're explicitly limiting the scope and acknowledging trade-offs: "For this prototype, we'll just use local storage, knowing we'll need to architect proper data persistence for production."

## Building a "Just"-Free Engineering Culture

**Run Assumption Check-Ins.** Before making big decisions, pause and ask: What are we assuming here? List out those assumptions and challenge them. It's a great way to catch hidden risks early.

**Recognize People Who Spot Complexity.** Instead of celebrating the person who says "it's easy," give credit to the ones who point out what could be tricky. They're helping the team avoid future pain.

**Do a "What Could Go Wrong?" Exercise.** Before moving forward with any "just" solution, ask the team: If this goes badly, what's most likely to break? It helps everyone develop a radar for complexity.

**Keep Track of Decisions and Trade-Offs.** Don't just write down what was decided - also note what options were considered and why some were rejected. That way, future team members will understand the context behind the choices.

**Make Space for Basic Questions.** Encourage questions that might sound "too simple." Those often uncover hidden problems or assumptions the team hasn't thought about yet.

## The Bottom Line

The words we use shape the conversation - and the conversation shapes what we build. When we challenge "just" in engineering discussions, we're not being overly picky. We're showing humility. We're recognizing that complex systems often behave in ways we can't fully predict.

And that matters - because the software we build impacts real people.

"Just add a login with Google" can turn into complex account linking issues and privacy concerns. "Just switch to a new database" can result in unexpected downtime and data migration headaches. "Just make it faster" can lead to fragile code, skipped testing, and bugs that are difficult to track.

So the next time you catch yourself about to say "just," pause. Ask yourself: What are we assuming? What might we be missing? What could go wrong that we haven't thought about yet?

That small moment of reflection could save your team a lot of trouble - and your users will thank you for it.

What patterns have you noticed in your own team's language around complexity? Have you found other words that carry similar minimization effects? Share your observations and help build more thoughtful technical discourse!
