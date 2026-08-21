---
seoTitle: How We Built Gaspar, Our AI Sales Assistant
slug: building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture
tag: AI
tags: AI, Architecture
title: Part 1: We Built an AI Assistant That Sells. Here’s the Architecture.
subtitle: Meet Gaspar: an AI assistant that answers from real company data, qualifies leads, and never stops pointing toward a next step.
intro: Meet Gaspar: an AI assistant that answers from real company data, qualifies leads, and never stops pointing toward a next step.
date: July 30, 2026
dateModified: August 16, 2026
readTime: 6 min read
mediumUrl: https://medium.com/p/546eab676aef
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 1
---
![Part 1: We Built an AI Assistant That Sells. Here’s the Architecture.](/images/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture-header.webp)

Part 1 of 5: “Building Gaspar - Anatomy of a Business AI Assistant”

When we set out to build an AI assistant for ARG Software, we didn’t start with “how do we add a chat widget.” We started with a question: why does our contact form convert so poorly?

The answer was obvious. Visitors would rather not fill out a form and wait. They want to know if we’re the right fit before they commit to a conversation. They want answers about our stack, our rates, our past work, and whether we’ve solved problems like theirs, without having to lose too much time navigating. A contact form can’t do that. A generic ChatGPT wrapper can’t either; it would hallucinate our pricing and confidently attribute Python to our CTO.

So we built Gaspar, not a chat widget with our logo on it, but a member of the team with a name, a personality, and a profile that answers “Who are you?” before it answers anything else.

![Gaspar architecture overview](/images/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/gaspar-architecture-overview-2.webp)

## The shape of the problem 🏗

A useful business chatbot has to do three things well:

- Answer from real company data, not the internet’s guess about your company;

- Guide every interaction toward a business outcome, whether that’s a meeting, an email, or a profound engagement with your content;

- Never lie, especially about capabilities, pricing, or who knows what.

These aren’t nice-to-haves. They shaped everything: which model we use, how it finds information, what it does when it doesn’t know something, and what happens the second someone says “I want to hire you.”

## One widget, two modes 🔄

Gaspar sits in the bottom-right corner of every page, with a small animated icon. Click it, and a panel opens (full-screen on mobile).

Mode 1: Conversation. Ask a question, and it answers using our actual project data, blog posts, team profiles, and policies, with links back to the source and related articles suggested alongside.

Mode 2: Lead capture. When someone signals they would like to work with us, the assistant offers clear next steps: book a meeting, send an in-chat message through Gaspar, or open a full contact form.

If they choose to message through Gaspar, the flow becomes guided: email, optional message, confirmation, submit. No natural language guessing for this part. Personal details go to Web3Forms(a free form email provider) and never touch the LLM, the large language model that writes the AI answers.

![Part 1: We Built an AI Assistant That Sells. Here’s the Architecture.](/images/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture-3.webp)

Gaspar can also start the conversation itself. After the homepage intro finishes, it can pop up after someone browses quietly for a while, on any page except the contact page. Dismiss it once, and it stays quiet for that visit. Say, “Don’t show me again,” and it won’t ask for two days.

## The pipeline in thirty seconds ⏱

Here’s what happens between “user types a question” and “answer appears”:

- Fetch and solve a proof-of-work challenge. 🔐 ALTCHA prepares a small cryptographic puzzle when the widget opens. The browser solves it in background Web Workers, so the proof is ready before the visitor sends a message.

- Classify intent. 🔍 DeepSeek checks whether this is small talk, an unsupported topic, a request to rewrite the previous answer, or a real question about ARG. Only real questions touch the database.

- Plan retrieval🗺 . “What’s your experience with fintech, and who’s your Go expert?” is really two questions. The system splits it so each part gets looked up properly.

- Retrieve context. 🏗Each sub-question resolves to the right route: portfolio work, commercial delivery, open source, link actions, people, careers, blog, technology quality, or general company services. Some routes use vector search. Others use exact matches, dates, known entities, or direct source reads.

- Generate the answer. ✍ DeepSeek reads the conversation history plus numbered context blocks, follows a hardcoded response policy, and produces a plain-text answer.

- Deciding what to offer next. Depending on the topic, Gaspar can suggest booking a meeting, sending a message, opening a contact form, or emailing the careers team.

- Three LLM calls per question. Temperature 0 for planning, 0.2 for answers. No streaming-deliberate, not a limitation.

That is three model calls for a real question: classify, plan, answer. Temperature 0 for routing and planning, 0.2 for answers. No streaming, deliberately.

## What makes this different from a chat bubble 🫧

The architecture decisions that matter most aren’t the ones you’d find in a tutorial:

- Intent classification saves money and credibility. Off-topic requests get redirected before they ever reach the answer-writing step. That means no wasted retrieval and no made-up capabilities.

- Gaspar understands language preference. It can answer in the visitor’s detected language, switch when asked, and remember a language preference for the session. The widget copy itself, buttons, placeholders, and status messages, can also be translated through a separate UI copy endpoint.

- Lead capture is strict, not conversational. We tried letting the AI pull emails out of normal conversation. It was creative, but occasionally wrong. Now it is a state machine with buttons and strict validation.

- Personal info stays separate. Lead details are handled in their path, completely apart from the AI conversation. The AI never sees an email address.

- Every dead end has a next step. Don’t recognize a technology? “We can assess and adapt: let’s book a call.” No answer found? “Email us directly.” Unclear what’s being asked about? It asks for clarification. It never just says “I don’t know” and stops.

- Security without friction. The background check runs quietly while you’re still reading the page, so it never adds a delay.

## Why this series

Building Gaspar took us through problems we didn’t anticipate: an idiom in our copy (“go-to production languages”) that the model interpreted as evidence we use Go. Rate-limiting a public AI endpoint without breaking the experience for real users. Deciding when to trust the model and when to use a state machine instead.

In the next four parts, we’ll open up the pieces:

- Part 2: The four-intent pipeline - classification, conversation transforms, retrieval planning, and answer generation;

- Part 3: Knowledge design - how we structure company data for retrieval;

- Part 4: Guardrails - the Go idiom story, evidence firewalls, and why deterministic beats conversational for PII;

- Part 5: Operations and growth - ALTCHA, rate limits, hard budgets, and the conversion funnel that measures it all.

If you want to see Gaspar in action, it’s live at[arg.software](https://arg.software). Ask it about our stack. Ask it about hiring. Ask it what happens when you mention a technology we’ve never used, and watch it sell without bluffing.

Next: Part 2 - “Three LLM Calls per Question: A RAG Pipeline That Knows What It’s Doing”(coming soon)
