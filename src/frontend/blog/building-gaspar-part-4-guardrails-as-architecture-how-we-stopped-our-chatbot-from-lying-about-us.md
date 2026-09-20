---
seoTitle: Securing an AI Chatbot with Layered Guardrails
slug: building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us
tag: AI
tags: AI, Security, Architecture
title: Part 4: Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us
subtitle: Why telling an AI to “behave” isn’t enough, and what it actually takes to stop a chatbot from making things up.
intro: Why telling an AI to “behave” isn’t enough, and what it actually takes to stop a chatbot from making things up.
date: August 17, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
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

So what happened? The model had found a real trigger, then made an unsupported inference from it. Our website copy said our “go-to production languages” are TypeScript, JavaScript, and C#.

Humans instantly read “go-to” as an idiom, like “my go-to coffee order.”

But a language model does not interpret every idiom as reliably as a person. The retrieval and generation pipeline saw “go” next to “production languages” and treated it as evidence that we use the Go programming language. Classic false positive. 🚨

That one small bug taught us something big:

> Guardrails can’t just be a sentence in a prompt.

> A prompt can be misapplied or outweighed by ambiguous context. Important guardrails need architectural enforcement as well as instructions.

![AI chatbot guardrails architecture for safer business answers](/images/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us-2.webp)

## 🧱 Layer 1: Policy as Data

Gaspar has a provider-agnostic assistant policy in the domain layer.

Think of it as Gaspar's internal rulebook, embedded in the application's core logic. It is not tied to DeepSeek, Gemini, Supabase, React, or Netlify.

This rulebook holds plain business rules, like:

- 🔤 “Go-to” is an idiom, not proof that ARG uses the Go language;
- 🐍 Python can be mentioned when it fits AI, automation, data, scripting, or integration work, but it is not our main language;
- 📝 Blog articles can show that we understand a technology, but they are not proof that we shipped a project with it or that a named person uses it;
- 📊 Approved commercial reference data can shape an answer, but its external source must not be disclosed;
- 🙅 If we cannot confirm that ARG uses a technology, Gaspar should not bluff. It should say that it is outside our usual stack and that we can assess it if it is the right fit.

Here is the useful part: the same policy has two jobs.

- A focused subset is included in the model's system instructions on every answer-generation call;
- The full policy object is also ingested as an `assistant-policy` knowledge source, chunked and retrieved beside relevant website, FAQ, project, blog, or approved reference evidence.

This is deliberately redundant. The standing instruction establishes the boundary, while retrieval can place the specific policy fact beside ambiguous evidence at the moment it matters.

The difference is not just wording. It is placement and enforcement at more than one layer. 🎯

## 📋 Layer 2: Prompt Rules

On top of the policy source, the prompt that generates Gaspar’s answers reinforces important rules:

- Gaspar must answer from the supplied context rather than improvising facts;
- Gaspar speaks in the first person as the voice of the ARG website;
- Gaspar stays in character rather than presenting itself as a generic chatbot;
- Gaspar answers in the selected language;
- Conversation history helps resolve references, but previous messages are not treated as evidence;
- Gaspar must not invent budgets, timelines, capabilities, project experience, or individual skills.

We are not trying to make Gaspar sound clever or creative here. We are trying to make each answer safe, useful, and consistent. Prompts are still probabilistic controls, however, so the harder boundaries sit outside them.

## 🔍 Layer 3: Retrieval and Evidence Filters

This layer runs before the model writes the final response.

Quick explainer: “retrieval” is the step where the system searches documents and structured data for relevant snippets to give the model as context. This is usually called retrieval-augmented generation, or RAG.

For technology questions, we do not let retrieval blindly trust every match. Exact-technology routes can use lexical evidence, broader questions can use semantic search, and both are constrained by source and evidence rules. The code removes “go-to” when checking exact terms and rejects policy wording that explicitly says Go is unconfirmed evidence.

This reduces the problem at its root. Bad context can still exist, and a generative model can still fail, but filtering makes the unsupported conclusion much less likely and gives the final prompt cleaner evidence.

The same principle applies to people, not just technologies:

> Just because ARG uses Python somewhere does not mean every individual team member knows Python.

If someone asks “Does [founder’s name] know Python?”, Gaspar needs person-specific profile or redacted-CV evidence, not company-wide evidence. Retrieval metadata marks individual scopes, routing asks for clarification when the person is ambiguous, and the answer prompt forbids company-to-person attribution. We call that combination an evidence firewall.

## 🔒 The PII Firewall

Forget Go for a second. This next boundary is about something more sensitive: personal data.

PII means personally identifiable information, such as email addresses, phone numbers, home addresses, or other data that can identify a person.

An early lead-capture approach asked the model to parse contact details from normal conversation. A visitor might type:

> “My email is john@example.com and I need help with fintech.”

The model would try to extract the email and message. It mostly worked, but “mostly” is not good enough for contact data. ⚠

So we removed the answer model from that process.

![AI chatbot hallucination prevention with RAG guardrails](/images/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us-3.webp)

Lead capture now runs as a state machine, a fixed sequence of application states:

offer → email → optional message → confirmation → submitting → success

In practice:

- 🖱 Confirmation and submission choices are explicit application actions rather than model decisions;
- ✉ Email and optional-message input is parsed with deterministic rules: one email is required, multiple email addresses are rejected, and empty input is blocked where appropriate;
- 🚫 Lead-capture messages are tagged separately and excluded from the chat history sent to the answer model;
- 📈 Analytics receive structural events such as `assistant_lead_capture` with an action like `succeeded`, and `assistant_action_click`, not the email or message text.

The contact details go directly to our form-delivery provider. They can also appear in Gaspar's encrypted operational conversation log, which is retained under our privacy policy, but they are not sent to the answer model or GA4. That distinction matters: isolation from a model is not the same thing as saying data is never stored anywhere.

This is the kind of guardrail we trust more than a prompt:

> “The answer model does not receive the lead-capture data.” That is a real, testable boundary.

## 🌍 Language Guardrails

Gaspar also has rules around human languages, as opposed to programming languages. Yes, the distinction matters more than you might expect.

An intent-classification call returns a language estimate, with deterministic English and Portuguese markers able to override it for the latest question. Language preference is handled separately:

- If someone says “answer in Portuguese from now on,” the backend returns an explicit `set` action and the browser carries that preference into later requests;
- If they clear it, the backend returns `clear` and the browser goes back to detection;
- The browser also keeps the language of a successful response for continuity during the current widget session.

We also taught Gaspar to distinguish two meanings of “language”:

- 🗣 “Can you speak French?” is about Gaspar's human-language capability and profile;
- 💻 “What programming languages do you use?” is about ARG's technology stack.

Keeping those routes separate prevents human-language questions from becoming unsupported technology claims.

## ✅ Tests as Living Documentation

When we find a repeatable failure mode, we try to turn it into a test. The current suite includes:

- 🎭 Persona consistency;
- 🔤 The Go idiom bug;
- 🌍 Language routing and preferences;
- ☠ “Poisoned” history and prompt injection, where earlier messages try to establish unsupported facts or override retrieval rules;
- ❓ Unsupported and insufficient-context questions;
- 💰 Pricing and project-duration questions;
- 👤 Individual skill attribution;
- 📚 Blog discovery and recommendations;
- 🧭 Retrieval routing, source priority, and evidence isolation.

The evaluation prompt bank contains more than 100 non-duplicated prompts, backed by executable routing and use-case cases. Unit and API tests also cover policy, persona, language, security, fallback, and controller behavior.

These tests are not proof that a model can never fail. They are executable documentation of the failures we know how to name. Prompts drift, models change, providers update, and source data evolves. Tests make those changes visible.

## 🎯 What Guardrails Really Are

At the end of the day, guardrails are boundaries:

- The line between “go-to” and “Go” → exact-term filtering plus policy context;
- The line between company-wide and individual skills → metadata, routing, and source scoping;
- The line between chat and lead capture → separate state and model-input isolation;
- The line between Gaspar and a generic chatbot → persona instructions and UI copy;
- The line between “I cannot confirm that” and “we can assess it” → a controlled fallback and handoff.

Some boundaries are reinforced by prompts, but none relies on a prompt alone.

That is the real lesson: 👉 if something actually matters, do not only write it in a prompt. Represent it in routing, retrieval, data flow, tests, and the architecture around the model.

Previous: [Part 3 - “The Knowledge Design Behind a Business AI Assistant That Doesn’t Guess”](https://arg.software/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/)

Next: [Part 5 - “Keeping an AI Assistant Online, Affordable, and Actually Useful”](https://arg.software/blog/building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful/)
