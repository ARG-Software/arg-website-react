---
seoTitle: RAG Pipeline Design: 3 LLM Calls Per Question Explained
slug: building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture
title: Part 2: Three LLM Calls per Question: A RAG Pipeline That Knows What It’s Doing
subtitle: Inside Gaspar’s normal three-call RAG path: classify, plan, retrieve evidence, and answer without asking one prompt to do every job. 🧠
intro: Inside Gaspar’s normal three-call RAG path: classify, plan, retrieve evidence, and answer without asking one prompt to do every job. 🧠
date: August 4, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 7 min read
mediumUrl: https://medium.com/p/285c020b0daf
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 2
---
![Part 2: Three LLM Calls per Question: A RAG Pipeline That Knows What It’s Doing](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-header.webp)

Part 2 of “Building Gaspar - Anatomy of a Business AI Assistant.” If you didn’t read [part one](https://arg.software/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/), start there.

The first design for Gaspar was too simple.

We gave the model a question, added some company context, and asked it to answer. One prompt, one call, done.

It worked… until it didn’t.

It could distort pricing, mix people up, or answer two questions with one vague paragraph. The problem wasn’t simply that the model was bad; we were asking one model call to do too many jobs at once.

So we split the work.

## The pipeline approach

Gaspar now runs a pipeline. A pipeline is just a sequence of steps, where each step has one job:

- Decide what kind of message this is

- Decide what information is needed

- Retrieve that information

- Write the answer

For a normal RAG question about ARG, that means three separate DeepSeek chat calls: classify → plan → answer. Retrieval happens between the second and third calls. Semantic routes may also request Gemini query embeddings, which are model operations but not chat-completion calls. Simpler messages take different paths: small talk and unsupported requests normally finish in the classifier response, while “rewrite that” can use classification plus a transform call when there is a previous answer to rewrite.

![RAG pipeline planning with three LLM calls per question](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-2.webp)

## 🧩 Call 1: Figure out what the visitor actually wants

Before Gaspar searches anything, it classifies the message. This call runs at temperature 0 because we want constrained output: a routing decision, an optional transform task, a short response for terminal intents, and a language tag.

A message can become one of four things:

- 💬 Small talk: a greeting, a thank-you, or someone sharing their name. The classifier includes the reply, so there is normally no corpus retrieval and no second generation call;

- 🚫 Unsupported: a request unrelated to ARG, our published technical material, or a possible project. The classifier normally returns the redirect itself;

- 🔁 Conversation transform: the visitor says “shorten that,” “I didn’t understand,” or “translate that to Portuguese.” Gaspar makes a second call to transform the latest assistant answer instead of retrieving new evidence;

- ❓ RAG question: a real question about ARG: services, projects, team, tech stack, pricing, hiring, articles, contact info, or possible work. These go through the full pipeline.

(Quick definition: RAG stands for retrieval-augmented generation. Before the model answers, we fetch relevant company information and hand it over as evidence.)

This same call returns a language tag:

```json
{"intent":"rag_question","task":"","response":"","language":"pt-PT"}
```

Gaspar does not rely on that field alone. A lightweight local detector can identify clear English or Portuguese first; otherwise the classifier’s tag is used. An explicit request such as “always answer in Portuguese” can set an in-memory preference for the current widget session, and a later reset request can clear it.

And if the classifier returns empty, malformed, or unsupported JSON? The parser treats the message as a RAG question. That can cost extra planning and retrieval, but it avoids rejecting a potentially valid question solely because routing output was malformed.

## 🗺 Call 2: Plan what to search for

Many questions are actually several questions stitched together. For example:

> “What’s your experience with fintech, and who’s your Go expert?”

That’s really two questions. One about project history, and one about a specific skill. Searching for both at once with a single vector search tends to return mixed, muddy results.

So Gaspar asks the model to break the message into as many as six smaller, standalone English retrieval questions:

```json
{
"questions": [
{ "query": "What fintech projects has ARG completed?", "mode": "direct_evidence", "entity": "ARG Software", "subject": "fintech" },
{ "query": "Which ARG team members have Go experience?", "mode": "direct_evidence", "entity": "ARG Team", "subject": "Go" }
]
}
```

Each item has one of three planner modes: direct evidence, editorial, or article discovery. The entity and subject fields give deterministic routing code enough structure to recognize project names, people, technologies, blog requests, commercial questions, and contact links without letting the planner answer the question itself.

If the planner output is missing or malformed, the parser falls back to one direct-evidence item. The original visitor question becomes its retrieval query. It is less precise, but the route still has something usable to work with. 👍

## 🔍 Retrieval: Pick the right search strategy

![AI assistant retrieval flow for RAG answer quality](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-3.webp)

This is where numerous RAG systems get lazy. They turn everything into a vector search.

Vector search is useful, but it’s not magic. It’s good at finding text with similar meaning. That works well for a broad question like “What kind of architecture work do you do?” It works less well for something like “What’s your latest article?” or “Where’s your GitHub?” Those have clear, exact answers that don’t need fuzzy matching.

Gaspar resolves each planned question to a route, then runs the first matching strategy in an ordered retrieval chain:

- 📁 Project references: known project names resolve to project sources, while “top projects” uses explicit `reference_rank` metadata rather than similarity alone;

- 👤 People: exact or unambiguous first-name matching selects public person profiles, and professional-history searches can include person-scoped redacted CV evidence;

- 📝 Blog questions: “latest” selects the three newest dated posts and reads their first chunks, while topic and editorial questions use semantic search;

- 💰 Pricing and delivery: known general pricing and timeline phrases use lexical FAQ lookup; named project budgets or build durations use approved commercial facts from a trusted external snapshot; engagement duration comes from first-party project or partner sources;

- ⚙ Technology questions: exact lexical evidence is preferred for recognizable technology names, with strict word-boundary and evidence-scope filtering before semantic fallback;

- 🔗 Links and contact questions: these skip vector search and read the first chunk of the curated `site-links` source;

- 📍 Current-page questions: page metadata can resolve a known project name or, for scoped homepage, static-page, and blog references, select known source keys and force first-chunk retrieval.

Each route returns context records. Gaspar merges the sub-question results by chunk ID and keeps the strongest duplicate. The final prompt labels each block with an evidence scope, title, and, for blog posts, publication date.

## ✍ Call 3: Write the answer

Now, finally, the model writes something.

For a grounded answer, it receives:

- The visitor’s question

- Recent conversation history

- Numbered evidence blocks from retrieval

Along with strict instructions: speak as Gaspar, use first person, answer only from the given context, distinguish team evidence from named-person evidence, stay in the resolved language, and never describe itself as a generic assistant or language model.

This call runs at a slightly higher temperature (0.2), so the answer sounds a bit more natural and human, but still low enough to stay close to the evidence instead of wandering off.

After the model responds, Gaspar strips common Markdown formatting and normalizes a few third-person company phrases into team voice. Citations, article recommendations, and actions are assembled separately in application and domain code. Citations are intentionally conservative: the current response exposes at most one navigable first-party source, suppresses the current page, and suppresses citations entirely when trusted-external or assistant-policy context is present. Actions such as “Book a meeting” or “Send a message through Gaspar” come from deterministic patterns in the original question.

If retrieval returns no context, there may be no third call: Gaspar can return a deterministic unconfirmed-technology response immediately. Otherwise, the third call asks the model for an insufficient-context handoff. If every planned item is an ambiguous person reference, the third call asks for clarification instead.

## 🤔 Why not just use one big prompt?

A single-call chatbot runs into a few predictable problems:

- It may answer from the model’s training data instead of your actual company data;

- It may return vague, blended context for complex questions;

- It may confidently invent an answer when there’s no real evidence;

- It may treat “shorten that” as a brand-new search when the visitor just wanted a cleaner version of the last reply.

Splitting the work into steps makes each of these decisions explicit and separate:

- Classification decides whether to respond, transform, redirect, or retrieve;

- Planning breaks apart complex questions and describes each retrieval need;

- Deterministic routing picks the retrieval strategy and evidence boundary;

- Generation writes from retrieved evidence, or follows a specific no-context path when evidence is absent.

The model is still the core piece, but it’s no longer doing everything by itself. It’s one component in a system that can actually be tested, constrained, and improved over time. 🛠

That’s the difference between a chat bubble and a business assistant.

Next up: [Part 3 - “The Knowledge Design Behind a Business AI Assistant That Doesn’t Guess”](https://arg.software/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/) 📚
