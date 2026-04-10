---
seoTitle: The Word Sabotaging Your Engineering Team
slug: the-word-sabotaging-your-engineering-team
tag: Engineering · Culture
title: The Four-Letter Word That's Sabotaging Your Engineering Team
subtitle: Why "Just" is more dangerous than you think — and how to replace it with systems thinking.
date: June 18, 2025
readTime: 7 min read
mediumUrl: https://arg-software.medium.com/the-four-letter-word-thats-sabotaging-your-engineering-team-adc398aed5ef
excerpt: There's one small word that's quietly sneaking into engineering conversations and distorting perception of complexity. It shows up in meetings, code reviews, and Slack threads, making complex work sound effortless — and setting teams up for confusion, underestimation, and burnout.
---

![The four letter word sabotage](/images/blog/the-four-letter-word/the-four-letter-word-header.webp)

In today's world of rapid development and AI-powered tools, it's easy to believe that anything can be done quickly - sometimes with a single prompt. But there's one small word that's quietly sneaking into engineering conversations and distorting that perception: "just."

It may sound harmless, but this simple word has a profound impact. It shows up in meetings, code reviews, and Slack threads, making complex work sound effortless - and setting teams up for confusion, underestimation, and burnout:

- "Can't we just add a feature flag for this?"
- "Is it just a frontend styling issue?"
- "We could just refactor this service to use microservices"
- "Let's just migrate to the cloud this quarter"
- "Can't we just add two-factor auth to the existing flow?"

## The Hidden Problem with "Just"

When we use "just" in engineering contexts, we're activating what psychologists call the minimization bias - our tendency to underestimate the complexity and effort required for tasks we don't fully understand. This could create a cascade of problems.

### The Complexity Iceberg Effect

The word "just" makes any task sound simple and straightforward, even when it's not. Consider that "simple" feature flag addition:

- Feature flag infrastructure and management
- A/B testing framework integration
- Analytics and monitoring setup
- Rollback strategies and kill switches
- Performance impact on application startup
- Security implications of flag exposure
- Long-term technical debt from flag accumulation

What appears as a single feature above the surface has an entire ecosystem of considerations beneath.

### The Dunning-Kruger Amplifier

"Just" often comes from those furthest from the actual implementation. Product managers say, "Just add a button," executives suggest to "just scale horizontally," and stakeholders wonder why we can't "just make it faster." The word becomes a vehicle for overconfidence from those with incomplete knowledge.

### Psychological Safety Erosion

"Just" creates what researchers call question suppression. Team members internalize that if something is "just" a simple task, raising concerns makes them look incompetent. This shuts down the healthy skepticism that prevents bugs, outages, and technical debt.

### The Planning Fallacy Multiplier

Software projects are already notorious for underestimation. "Just" compounds this by making teams feel pressure to provide optimistic estimates that align with the implied simplicity. The result? Chronic missed deadlines and burnout.

## The Better Approach: Replace "Just" with Systems Thinking

Instead of using "just," adopt what systems engineers call assumption interrogation - actively questioning the premises behind any proposed solution:

Instead of: "Can't we just add a feature flag for this?" — Try: "What's our strategy for managing feature flag lifecycle and preventing flag debt accumulation?"

Instead of: "Is it just a frontend styling issue?" — Try: "Have we confirmed this behavior is consistent across browsers, devices, and accessibility tools?"

Instead of: "We could just refactor this to microservices" — Try: "What distributed systems challenges are we prepared to take on, and do we have the operational maturity for service mesh management?"

Instead of: "Can't we just add two-factor auth?" — Try: "How do we handle account recovery and accessibility requirements in our auth flow?"

## Why This Approach Works Better

- **Activates Second-Order Thinking.** Questions force us beyond immediate solutions to consider downstream effects, dependencies, and unexpected consequences.
- **Builds Antifragile Systems.** By questioning assumptions upfront, we create systems that don't just survive edge cases - they improve from them.
- **Surfaces Hidden Dependencies.** Complex systems have critical properties. What seems simple often involves multiple dependencies that questions help to identify.
- **Prevents Technical Debt Accumulation.** Quick "just" solutions often become tomorrow's problems. Systems thinking identifies these debt patterns up front.
- **Cultivates Expertise Recognition.** Questions acknowledge that different team members have specialized knowledge in their domains.

## The Cognitive Science Behind "Just"

Research in cognitive psychology reveals why "just" is so problematic in technical contexts.

**The Curse of Knowledge.** Experts forget what it's like not to know something. When they say "just," they're projecting their expertise onto a problem without accounting for the learning curve others face.

**Availability Heuristic.** We tend to judge how easy something is based on the last time we did something similar. If the previous "simple" change went smoothly, we assume the next one will, too - forgetting that was probably the exception, not the rule.

**Optimism Bias in Planning.** Humans systematically underestimate task duration and complexity. "Just" makes this bias even worse by making challenging problems sound easy - like we can solve them with a quick fix, even when they're anything but.

**Status Quo Bias.** "Just" solutions often preserve existing approaches rather than questioning whether we're solving the right problem in the first place.

## When "Just" Is Okay (Sort Of)

There are two acceptable uses of "just" - both involving self-awareness.

**Ironic Self-Deprecation.** Use it when you're jokingly pretending something is simple while knowing it's not: "Yeah, we can just build real-time collaboration… you know, like Google Docs did - with years of engineering and a team of PhDs."

**Bounded Context Acknowledgment.** When you're explicitly limiting the scope and acknowledging trade-offs: "For this prototype, we'll just use local storage, knowing we'll need to architect proper data persistence for production."

## Building a "Just"-Free Engineering Culture

**Run Assumption Check-Ins.** Before making big decisions, pause and ask: What are we assuming here? List out those assumptions and challenge them. It's a great way to catch hidden risks early.

**Recognize People Who Spot Complexity.** Instead of celebrating the person who says "it's easy," give credit to the ones who point out what could be tricky. They're helping the team avoid future pain.

**Do a "What Could Go Wrong?" Exercise.** Before moving forward with any "just" solution, ask the team: If this goes badly, what's most likely to break? It helps everyone develop a radar for complexity.

**Keep Track of Decisions and Trade-Offs.** Don't just write down what was decided - also note what options were considered and why some were rejected. That way, future team members will understand the context behind the choices.

**Make Space for Basic Questions.** Encourage questions that might sound "too simple." Those often uncover hidden problems or assumptions the team hasn't thought about yet.

## The Bottom Line

The words we use shape how we think - and how we think shapes what we build. When we stop saying "just" in engineering conversations, we're not being overly picky. We're showing humility. We're recognizing that complex systems often behave in ways we can't fully predict.

And that matters - because the software we build impacts real people.

"Just add a login with Google" can turn into complex account linking issues and privacy concerns. "Just switch to a new database" can result in unexpected downtime and data migration headaches. "Just make it faster" can lead to fragile code, skipped testing, and bugs that are difficult to track.

So the next time you catch yourself about to say "just," pause. Ask yourself: What are we assuming? What might we be missing? What could go wrong that we haven't thought about yet?

That small moment of reflection could save your team a lot of trouble - and your users will thank you for it.

What patterns have you noticed in your own team's language around complexity? Have you found other words that carry similar minimization effects? Share your observations and help build more thoughtful technical discourse!
