---
seoTitle: How We Secured and Scaled Our AI Chatbot With Minimum Cost
slug: building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful
tag: AI
tags: AI, Reliability, Security
title: Part 5: Keeping an AI Assistant Online, Affordable, and Actually Useful
subtitle: How proof-of-work, layered rate limits, and hard budgets keep a public AI chatbot secure, affordable, and conversion-focused
intro: How proof-of-work, layered rate limits, and hard budgets keep a public AI chatbot secure, affordable, and conversion-focused
date: August 19, 2026
dateModified: August 19, 2026
readTime: 7 min read
mediumUrl: https://medium.com/p/53e8ef15ae81
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 5
---
Part 5 of “Building Gaspar - Anatomy of a Business AI Assistant”

![Part 5: Keeping an AI Assistant Online, Affordable, and Actually Useful](/images/blog/building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful/building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful-header.webp)

Building an AI assistant is one challenge. Keeping it running smoothly, cheap to operate, and genuinely helpful once it’s live? That’s a different game.

When we launched Gaspar, three big questions arose:

- How do we stop bots and abuse without annoying real visitors?

- How do we keep costs predictable and low when anyone on the internet can hit our endpoint?

- How do we actually know if this thing is helping the business?

At the end, there was no silver-bullet feature. Instead, we built a bunch of small, smart layers that work together. Let’s break them down. 👇

## 🧩 Proof-of-Work: Security You Never Feel

Every single question Gaspar answers is protected by something called proof-of-work.

Sounds intimidating, but the idea is actually simple: before our server spends a cent generating an answer, the visitor’s browser has to solve a tiny cryptographic puzzle first. Think of it as a quick “prove you’re a real device” handshake.

- A real visitor’s browser solves it instantly, in the background. They never notice.

- A bot trying to spam thousands of fake requests has to solve that puzzle thousands of times, which gets expensive and slow for them, fast.

We use a tool called ALTCHA, which generates a signed cryptographic challenge. The clever part is the timing: we solve the puzzle before the visitor even hits “send.”

Here’s the flow:

- The chat widget opens

- The browser quietly fetches and solves a challenge in the background (using Web Workers, so it doesn’t freeze the page)

- That solved proof just sits ready in memory

- When the visitor types a question and submits, the proof is already there. No delay, no popup, no annoying “select all the traffic lights” test. 🚦❌

## 🛡 Three Layers of Abuse Protection

![AI assistant rate limits and proof of work security architecture](/images/blog/building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful/part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful-2.webp)

We don’t rely on one single wall; we built three, stacked on top of each other:

🥇 Layer 1 - Rate limits at the server level: Our hosting platform (Netlify) caps how many requests can come from the same IP or domain per minute. Go over that, and you get an instant 429 "slow down" response, before we even spend any AI budget on it.

🥈 Layer 2 - The proof-of-work check (ALTCHA): Every question sent to Gaspar must come with a valid, freshly-solved puzzle. Each solution can only be used once and expires quickly. No valid proof = the request is rejected immediately, before we even search for an answer.

🥉 Layer 3 - Our own internal budgets: Inside the actual assistant logic, we track usage in our database (Supabase): per-minute limits, per-day limits, and a hard daily ceiling across everyone. For privacy, IP addresses are scrambled (salted and hashed) before we ever store them. And if our database has a hiccup? This layer just steps aside gracefully; the other two layers still hold the fort. 💪

Why layers matter: things break. Services go down. Configs get messed up. That’s just life with software. But when protection is split across multiple independent layers, one failure doesn’t bring the whole system crashing down.

Bonus: this same ALTCHA setup also protects our contact form, one security pattern, reused everywhere we accept public input.♻

## 💰 Keeping AI Costs Predictable

Running an AI assistant that anyone on the internet can use is a bit scary from a budgeting standpoint. So, we built in guardrails before the expensive part even happens:

- Intent classification: filters out small talk and off-topic questions early, before they reach the costly parts of the pipeline;

- Conversation transforms: let us reuse a previous answer and rewrite it, instead of running a brand-new (and pricier) search every time;

- Smart retrieval planning: only kicks in for genuine, answerable questions;

- Backup embedding models: if our primary AI provider hits a quota limit, we automatically fall back to a secondary one, so the assistant doesn’t just go dark.

On top of all that, there’s a hard daily spending cap. If we hit it, visitors simply get a polite “please try again later” message instead of us quietly racking up a surprise bill.

The takeaway: a public-facing AI feature without a spending cap isn’t really a product decision: it’s an open-ended risk. A blank check, basically.

## 🚀 The Assistant Isn’t Just a Q&A Bot: It’s a Growth Tool

An assistant that gives accurate answers is nice. An assistant that also guides people toward the right next step is genuinely valuable for a business.

Gaspar doesn’t just reply with text, it can suggest actions too:

- 📅 book_meeting-when someone shows real buying intent;

- 💬 gaspar_message-kicks off an in-chat conversation to capture a lead;

- 📝 contact_form-for people who want to share a fuller project brief;

- 📧 email_hr-for job-seekers asking about careers.

Here’s the architectural trick: the backend only decides what type of action makes sense, it doesn’t write the button text. The frontend decides how to present it, in whatever language and style best fit the current page. Business logic and presentation stay cleanly separated.

So for example:

- Ask about our fintech experience? Gaspar shares real project examples and offers to book a meeting;

- Ask about hiring? It points you toward careers;

- Ask about a technology we don’t specialize in? Instead of a flat “I don’t know,” it says something like “that’s not our usual stack, but we’re happy to take a look at your project.”

That’s the real difference: “I don’t know” vs. “here’s how we move forward.”

## 🙋 Proactive, Not Pushy

Gaspar doesn’t always wait to be asked, it can also start the conversation.

After the homepage intro plays out, an idle timer can pop the assistant open on non-contact pages with a friendly nudge like: “Want to send us a quick email?” On mobile, it opens fullscreen; on desktop, it slides in as a normal side panel.

Visitors always get simple, low-pressure choices:

- ✉ Send a quick email through the guided flow;

- 💬 Chat with Gaspar instead;

- ❌ Dismiss it.

And we respect that choice:

- A normal close just quiets it down for that session;

- “Don’t show me again” mutes it for two days;

- A successful lead mutes it permanently.

The goal was never to nag people into converting. It’s about making the next step easy right when someone might actually be ready for it. 🎯

## 📊 Measuring the Whole Funnel

Every meaningful interaction gets tracked through Google Analytics, but here’s the important part: we never send actual message content to analytics. Only structural, anonymous metadata. Privacy first. 🔒

![Affordable AI chatbot operations with budget controls](/images/blog/building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful/part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful-3.webp)

Here’s what we track:

- assistant_open - the widget was opened;

- assistant_submit-a question was sent;

- assistant_answer - an answer came back (including how many citations/actions it included);

- assistant_action_click-someone clicked a suggested action (like "book a meeting");

- assistant_citation_click - someone clicked a source/citation;

- assistant_article_recommendation_click-someone opened a recommended article;

- assistant_quick_prompt - someone clicked one of the suggested starter questions;

- assistant_error-something went wrong;

- lead_capture-tracks impression, submit, success, dismiss, or error states.

Put together, this gives us a clean funnel to analyze:

assistant_open → assistant_submit → assistant_answer → assistant_action_click → lead_capture: success

Each step tells us something different:

- 🤔 People opening the widget but not asking anything? Maybe the welcome message needs work;

- 🤷 People getting answers but never clicking the action buttons? Maybe the CTAs aren’t relevant enough;

- 😩 Leads starting but not finishing? Maybe the flow has too much friction.

This turns the assistant into something measurable without being invasive.

## 💵 What Did All This Actually Cost?

Surprisingly, the infrastructure itself is pretty affordable: Netlify for hosting functions, Supabase for storage and vector search, DeepSeek for generating answers and classifying questions, Gemini for embeddings, Web3Forms for delivering leads, and GA4 for analytics. We can say that, practically, we spend less than $ 2 to 3$ per month.

The real cost wasn’t the cloud bill; it was the engineering time: building the retrieval pipeline, designing reliable sources, setting up guardrails, handling multiple languages, localizing the UI, implementing rate limits, writing tests, and designing the entire lead-capture flow.

Anyone can slap a chat box onto a website in an afternoon. It takes real care to build one that’s accurate, safe, measurable, and actually tied to business results.

Gaspar doesn’t just talk to visitors. It helps them take the next step. ✅

This wraps up the “Building Gaspar” series! 🎉 Want to see the assistant in action? Head over to[arg.software](https://arg.software/)and ask it anything.
