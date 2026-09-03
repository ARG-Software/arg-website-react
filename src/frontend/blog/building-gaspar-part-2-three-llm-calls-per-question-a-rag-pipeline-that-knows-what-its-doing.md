---
seoTitle: RAG Pipeline Design: 3 LLM Calls Per Question Explained
slug: building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing
tag: AI
tags: AI, Architecture
title: Part 2: Three LLM Calls per Question: A RAG Pipeline That Knows What It’s Doing
subtitle: Inside Gaspar’s 3-step LLM pipeline: classify, plan, and retrieve before answering. Built to avoid vague, generic, or made-up responses. 🧠
intro: Inside Gaspar’s 3-step LLM pipeline: classify, plan, and retrieve before answering. Built to avoid vague, generic, or made-up responses. 🧠
date: August 4, 2026
dateModified: August 16, 2026
readTime: 6 min read
mediumUrl: https://medium.com/p/285c020b0daf
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 2
---
![Part 2: Three LLM Calls per Question: A RAG Pipeline That Knows What It’s Doing](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-header.webp)

Part 2 of “Building Gaspar - Anatomy of a Business AI Assistant” If you didn’t read part one, click [here](https://arg.software/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/).

The first version of Gaspar was too simple.

We gave the model a question, added some company context, and asked it to answer. One prompt, one call, done.

It worked… until it didn’t.

It distorted pricing. Likewise, it mixed people up. It tried to answer two questions with one vague paragraph. The problem wasn’t that the model was bad; it’s that we were asking one model call to do too many jobs at once.

So we split the work.

## The pipeline approach

Gaspar now runs a pipeline. A pipeline is just a sequence of steps, where each step has one job:

- Decide what kind of message this is

- Decide what information is needed

- Retrieve that information

- Write the answer

For a full question about ARG, that means three separate LLM calls: classify → plan → answer. Simpler messages (small talk, off-topic requests, “rewrite that”) take shorter paths and skip some of these steps.

![RAG pipeline planning with three LLM calls per question](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-2.webp)

## 🧩 Call 1: Figure out what the visitor actually wants

Before Gaspar searches anything, it classifies the message. This call runs at temperature 0, meaning we want boring, predictable output. No creativity, just a routing decision.

A message can become one of four things:

- 💬 Small talk: a greeting, a thank-you, someone sharing their name. Gaspar replies warmly. No database lookup, no search;

- 🚫 Unsupported: anything unrelated to ARG, our work, or a possible project. Gaspar redirects politely;

- 🔁 Conversation transform: the visitor says “shorten that,” “I didn’t understand,” or “translate that to Portuguese.” Gaspar rewrites the previous answer instead of searching for new information. Because they’re not asking a new question, they’re asking for the last one in a better shape;

- ❓ RAG question: a real question about ARG: services, projects, team, tech stack, pricing, hiring, articles, contact info, or possible work. These go through the full pipeline.

(Quick definition: RAG stands for retrieval-augmented generation. Before the model answers, we fetch relevant company information and hand it over as evidence.)

This same call also detects the language of the message. There’s no separate language detector, the first call returns something like:

```
{"intent": "rag_question", "language": "pt-PT"}
```

Gaspar then replies in that language automatically. If a visitor explicitly asks to stick to one language for the rest of the conversation, that preference is kept for the session.

And if the classifier messes up the JSON? No big deal, Gaspar just treats the message as a real question. Worst case, it searches a bit more than necessary. It never rejects a valid question just because formatting went wrong.

## 🗺 Call 2: Plan what to search for

Many questions are actually several questions stitched together. For example:

> “What’s your experience with fintech, and who’s your Go expert?”

That’s really two questions. One about project history, and one about a specific skill. Searching for both at once with a single vector search tends to return mixed, muddy results.

So Gaspar asks the model to break the message into smaller, standalone questions:

```
{
"questions": [
{ "query": "What fintech projects has ARG completed?", "subject": "fintech" },
{ "query": "Which ARG team members have Go experience?", "subject": "Go" }
]
}
```

This step also pulls out useful hints like project names, people, technologies, blog topics, pricing language, contact intent and passes them along to the retrieval step.

If planning fails for any reason, Gaspar falls back to a single search using the original question. Less precise, but still functional. 👍

## 🔍 Retrieval: Pick the right search strategy

![AI assistant retrieval flow for RAG answer quality](/images/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing-3.webp)

This is where numerous RAG systems get lazy. They turn everything into a vector search.

Vector search is useful, but it’s not magic. It’s good at finding text with similar meaning. That works well for a broad question like “What kind of architecture work do you do?” It works less well for something like “What's your latest article?” or “Where's your GitHub?”. Those have clear, exact answers that don’t need fuzzy matching.

So Gaspar routes each planned question to a specific strategy:

- 📁 Projects: matched using known project names and metadata;

- 👤 People: names are resolved first, then matched against person-specific sources and redacted CV data;

- 📝 Blog questions: sorted by date for “latest posts” or searched semantically for a topic;

- 💰 Pricing & delivery: pulled from FAQ and approved commercial context (some of this informs the answer but is deliberately left out of citations);

- ⚙ Technology questions: combine exact text matching with semantic search to avoid mix-ups like confusing “go-to language” with the Go programming language;

- 🔗 Links & contact questions: often skip vector search entirely. If someone asks how to book a meeting, that answer comes straight from the site link's source, not from approximate similarity.

Each route returns chunks of context. Gaspar merges them, removes duplicates, and labels each block by source type before handing everything to the final step.

## ✍ Call 3: Write the answer

Now, finally, the model writes something.

It receives:

- The visitor’s question

- Recent conversation history

- Numbered context blocks from retrieval

Along with strict instructions: speak as Gaspar, use first person, answer only from the given context, stay in the resolved language, and never describe itself as a generic AI assistant or language model.

This call runs at a slightly higher temperature (0.2), so the answer sounds a bit more natural and human, but still low enough to stay close to the evidence instead of wandering off.

After the model responds, Gaspar cleans things up. Strips Markdown formatting, keeps the tone consistent, attaches citations separately, and adds relevant actions, like “Book a meeting” or “Send a message through Gaspar”, when the visitor shows commercial intent.

## 🤔 Why not just use one big prompt?

A single-call chatbot runs into a few predictable problems:

- It may answer from the model’s training data instead of your actual company data;

- It may return vague, blended context for complex questions;

- It may confidently invent an answer when there’s no real evidence;

- It may treat “shorten that” as a brand-new search when the visitor just wanted a cleaner version of the last reply.

Splitting the work into steps makes each of these decisions explicit and separate:

- Classification decides whether to answer, transform, redirect, or retrieve

- Planning breaks apart complex questions

- Retrieval picks the right source for each one

- Generation only writes once real evidence is on the table

The model is still the core piece, but it’s no longer doing everything by itself. It’s one component in a system that can actually be tested, constrained, and improved over time. 🛠

That’s the difference between a chat bubble and a business assistant.

Next up - Part 3: “Grounding an LLM in Your Business: Knowledge Design for Company Chatbots” 📚
