---
seoTitle: Securing an AI Chatbot Without the Cost
slug: building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us
tag: AI
tags: AI, Security, Architecture
title: Part 4: Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us
subtitle: Why telling an AI to “behave” isn’t enough, and what it actually takes to stop a chatbot from making things up.
intro: Why telling an AI to “behave” isn’t enough, and what it actually takes to stop a chatbot from making things up.
date: August 16, 2026
dateModified: August 19, 2026
readTime: 8 min read
mediumUrl: https://medium.com/p/93a4d22ff549
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 4
---
Part 4 of “Building Gaspar - Anatomy of a Business AI Assistant”

![Part 4: Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us](/images/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us-header.webp)

Here’s the story of how one harmless little phrase in our website copy accidentally created a false claim about our technology stack.

During testing, we asked our AI assistant, Gaspar, a simple question:

> “What programming languages does ARG use?”

Gaspar’s answer included Go.

Except… we don’t actually use Go as one of our production languages. 🤔

So what happened? The model wasn’t hallucinating; it found a real trigger. Our website copy said our “go-to production languages” are TypeScript, JavaScript, and C#.

Humans instantly read “go-to” as an idiom (like “my go-to coffee order”).

But a language model doesn’t feel idioms the way we do. It saw the word “Go” sitting right next to “production languages” and treated it as evidence that we use the Go programming language. Classic false positive. 🚨

That one small bug taught us something big:

> Guardrails can’t just be a sentence in a prompt.

> A prompt can be ignored, misread, or simply outweighed by whatever context gets pulled in. Real guardrails have to be built into the architecture, not just politely requested.

![Part 4: Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us](/images/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us-2.webp)

## 🧱 Layer 1: Policy as Data

Gaspar has something called an AssistantPolicy.

Think of it as Gaspar's internal rulebook, embedded in the app's core logic. It's not tied to any specific AI provider or tool. It doesn't care whether we're using DeepSeek, Gemini, Supabase, React, or Netlify; it's provider-agnostic by design.

This rulebook holds plain business rules, like:

- 🔤 “Go-to” is an idiom, not proof that ARG uses the Go language;

- 🐍 Python can be mentioned when it fits AI, automation, data, or integration work, but it’s not our main language;

- 📝 Blog articles show that we understand a technology, but they’re not proof we shipped a project with it;

- 📊 Commercial/business data can shape an answer, but approved external sources shouldn’t be named or quoted directly;

- 🙅 If we’re not sure ARG uses a technology, Gaspar shouldn’t bluff. It should say something like, “We can evaluate it if it’s the right fit,” instead of making things up.

Here’s the nice part: this policy isn’t just an instruction; it’s also fed to the model as if it were a knowledge source, alongside actual reference documents.

A prompt rule sits permanently at the top of the system prompt, one line among many, present in every conversation whether it’s relevant or not.

A policy as data only enters the context when it’s actually retrieved - pulled in by the same search that fetches evidence chunks. That means it lands right next to the misleading text at the exact moment the model needs it, rather than being a distant rule diluted among dozens of others.

The difference isn’t the wording; it’s the placement.

That’s the real advantage: not a rule to remember, but a fact placed directly beside the evidence it’s meant to correct. 🎯

## 📋 Layer 2: Prompt Rules

On top of the policy, the actual prompt that generates Gaspar’s answers adds another layer of reinforcement.

The rules are simple:

- Gaspar must answer using the given context, no improvising;

- Gaspar speaks as Gaspar, in first person, not as “an AI language model” ;

- Gaspar won’t describe itself as a generic chatbot, even if directly asked;

- Gaspar sticks to whatever language the visitor is using;

- Gaspar never invents budgets, timelines, capabilities, or people’s individual skills.

We’re not trying to make Gaspar sound clever or creative here. We’re trying to make sure every answer is safe, useful, and consistent.

## 🔍 Layer 3: Retrieval Filters

This is the last line of defense, and it kicks in before the model even starts writing a response.

Quick explainer for anyone unfamiliar: “retrieval” is the step where the system searches through documents and data to find relevant snippets to hand to the AI model as context, so it can answer accurately (this is often called RAG, or “retrieval-augmented generation”).

For technology-related questions, we don’t let the retrieval step blindly trust every match it finds. If a text snippet only contains the word “Go” because of the phrase “go-to,” the system now knows that’s not valid evidence of us using the Go language. We combine keyword matching and semantic (meaning-based) search with specific disqualifying rules.

This stops the problem at its root. If the retrieval layer never hands the model bad evidence in the first place, the model can’t accidentally cite it.

The same principle applies to people, not just technologies:

> Just because ARG (the company) uses Python somewhere does not mean every individual team member knows Python.

So if someone asks “Does [Founder’s name] know Python?”, Gaspar needs person-specific evidence, not company-wide evidence. We call this an evidence firewall; it keeps different categories of information properly separated rather than letting them blend.

## 🔒 The PII Firewall (the most important guardrail of all)

Forget Go for a second. This next part is about something way more sensitive: personal data.

Quick definition: PII stands for Personally Identifiable Information - things like email addresses, phone numbers, home addresses, or anything else that could identify a specific person.

Our first attempt at capturing leads (potential client contact info) tried to have the AI model parse it directly out of normal conversation. A visitor might type something like:

> “My email is john@example.com and I need help with fintech.”

And the model would try to extract the email and the message. It mostly worked…

…but “mostly” is not good enough when you’re dealing with people’s personal data. ⚠

So we made a decision: remove the AI model from that process entirely.

![Part 4: Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us](/images/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us-3.webp)

Instead, lead capture now runs as a state machine, a way of saying it follows a fixed, predictable sequence of steps, like a flowchart:

offer → email → optional message → confirmation → submitting → success

Here’s what that means in practice:

- 🖱 During decision steps, the visitor can only click buttons. No free typing, no ambiguity;

- ✉ During the email/message steps, the input is checked using simple, predictable rules (a regular expression validates the email format, multiple emails get rejected, empty fields get rejected);

- 🚫 The AI model never sees any of this. The visitor’s email is submitted directly to our form-handling service and never enters the AI chat history;

- 📈 Our analytics only receive structural events like lead_capture:success or assistant_action_click , never the actual message content.

This is the kind of guardrail we actually trust. Not “we told the model not to leak personal data and hoped for the best,” but:

> “The model never receives the personal data in the first place.” That’s a real boundary.

## 🌍 Language Guardrails

Gaspar also has rules around human languages (as opposed to programming languages. Yes, there’s a difference, and it matters more than you’d think! ).

An “intent classifier” (a small system that detects what the visitor is trying to do) figures out which language the visitor is writing in. But language preference is handled separately from that detection:

- If someone says “answer in Portuguese from now on,” that preference is stored for the rest of the session;

- If they clear that preference, Gaspar simply goes back to auto-detecting their language.

We also had to teach Gaspar to tell the difference between two very different meanings of the word “language”:

- 🗣 “Can you speak French?” → This is a question about Gaspar itself (its capabilities), answered using its profile info;

- 💻 “What programming languages do you use?” → This is a completely different kind of question, about ARG’s tech stack.

Keeping these separate stops the system from mixing up human languages and programming languages, which, without this separation, could get confusing fast.

## ✅ Tests as Living Documentation

Every time we find a failure mode, we turn it into a test. Here’s what we currently test for:

- 🎭 Persona consistency (does Gaspar stay “in character”?);

- 🔤 The Go idiom bug (never again!);

- 🌍 Language routing;

- ☠ “Poisoned” conversation history - where a user tries to trick Gaspar by claiming “ARG uses Go” earlier in the chat, then asking it to repeat that claim later;

- ❓ Unsupported questions;

- 💰 Pricing questions;

- 👤 Individual skill attribution (person A vs. company-wide skills);

- 📚 Blog post recommendations;

- 🕳 Situations with insufficient context.

These tests aren’t just quality-control checkboxes. They’re living documentation of exactly what Gaspar is and isn’t allowed to do.

Why does this matter so much? Because prompts drift over time, models get updated, and providers change. Tests are what keep the actual behavior honest and consistent through all of that. 🧭

## 🎯 What Guardrails Really Are

At the end of the day, guardrails are just boundaries.

- The line between “go-to” and “Go” → a retrieval filter;

- The line between company-wide skills and individual skills → source scoping;

- The line between a normal chat and lead capture → data isolation;

- The line between Gaspar and a generic chatbot → persona policy;

- The line between “I don’t know” and “we can help with that” → a controlled fallback.

None of these boundaries depend on politely asking the model to behave.

That’s the real lesson here: 👉 if something actually matters, don’t just write it in a prompt - build it into the architecture.
