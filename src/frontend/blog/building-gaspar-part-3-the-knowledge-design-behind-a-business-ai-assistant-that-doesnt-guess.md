---
seoTitle: RAG Knowledge Design for Business Chatbots
slug: building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess
tag: AI
tags: AI, Architecture
title: Part 3: The knowledge design behind a business AI assistant that doesn’t guess
subtitle: Why embeddings alone aren’t enough and what it actually takes to make an AI assistant trustworthy
intro: Why embeddings alone aren’t enough and what it actually takes to make an AI assistant trustworthy
date: August 16, 2026
dateModified: August 16, 2026
readTime: 7 min read
mediumUrl: https://medium.com/p/10e7e6206c8e
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 3
---
Part 3 of “Building Gaspar - Anatomy of a Business AI Assistant”

![Part 3: The knowledge design behind a business AI assistant that doesn’t guess](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-header.webp)

An AI assistant is only as useful as the information it can trust.

Give it a flat dump of your website, and it’ll answer vaguely. Give it nothing, and it’ll fill the gaps with guesses. Give it private documents without rules, and it might leak things you never meant to expose.

> When we built Gaspar, the hardest part wasn’t choosing a model. It was deciding what Gaspar should know, how that knowledge should be stored, and which pieces should be allowed to answer which questions.

## 📚 What goes into the corpus

The corpus is the body of information Gaspar can search. Ours isn’t one giant text file, it’s a set of typed sources, each with its own role.

![Business AI assistant knowledge design for reliable RAG answers](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-2.webp)

Gaspar indexes public website content: homepage sections, project pages, partner information, FAQs, the About page, careers, and Working With Us content. It also indexes our blog posts, because many visitor questions are technical, and a blog article is often the best handoff.

Some sources are structured data rather than page text:

- 🗂 Projects have slugs, metrics, stacks, and ranking metadata;

- 🔗 Site links have explicit contact, booking, social, and form URLs;

- 🐾 Gaspar’s own profile lives in assistant.json, so questions like "who are you?" or "where were you born?" are answered from data, not the model's imagination;

We also have private or semi-private sources:

- 📄 Redacted CVs help answer named-person experience questions;

- 📁 A portfolio PDF contributes with specific evidence;

- 🌐 Trusted external profiles help with commercial context (though we suppress citations when that data is used).

And that last point matters: not every source is equal. Official website copy, FAQ answers, blog posts, private documents, and external references all carry different trust levels. Treating them the same would be lazy RAG.

## 🏷 Why metadata matters

Most people talk about embeddings first. Embeddings are important, but metadata is where a lot of the real quality comes from.

An embedding is a numerical representation of text. It lets the database find chunks with similar meaning. For example, a question about “payment networks” might match a project page that says “financial interoperability,” even if the words aren’t identical.

But embeddings alone don’t cover everything we need.

- If someone asks for the latest article → sort by date, not semantic similarity;

- If they ask about a specific founder → search that person’s evidence, not the whole company corpus;

- If they ask for top projects → rank metadata beats a model’s vague sense of relevance;

So every chunk stores metadata: source type, source key, title, date, person key, project rank, evidence scope, and URL information. Retrieval strategies lean on that metadata before falling back to vector search.

This gives us more predictable answers, and keeps the assistant from making common attribution mistakes, like treating a company-level stack statement as proof that one specific person has one specific skill.

## ✂ Chunking: small enough to search, large enough to mean something

Before text enters the vector database, it gets split into chunks: pieces of text that can be embedded and retrieved independently.

Gaspar’s default chunk size is 1,200 characters with 180 characters of overlap. The numbers are configurable, but the goal is simple: each chunk should contain a complete thought.

- Too small → the model retrieves fragments that don’t explain enough;

- Too large → the embedding becomes a blurry average of several topics;

- Overlap → prevents important details from getting lost at the edges;

We also prepend a short header to each chunk before it’s embedded, usually the source title, date, and topic, added just before the actual body text. So a blog chunk doesn’t just contain a paragraph of body text; it starts with something like “Angular 5 to 19 migration - [date] - [topic]” and then the paragraph.

Why bother? Because visitors often remember the headline, not the details inside the article. If someone asks “do you have that Angular migration post?”, the chunk needs to match on the title itself, not just on whatever technical content happens to be in that particular slice of the article. Baking the title into every chunk makes sure it’s always searchable, even in chunks pulled from deep in the middle of the post.

## 🔁 Dual embedding indexes

![RAG knowledge sources for a trustworthy business AI assistant](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-3.webp)

Gaspar stores two embeddings for each chunk: a primary and a fallback. Both come from configured Gemini embedding models, and both live in Supabase pgvector.

Why two? 🤔

Quota resilience.

Embedding APIs can hit rate limits. If the primary model returns a quota error, Gaspar quietly switches to the fallback model and searches the fallback index instead. The user never has to know, the answer just comes back. 🔄

One hard rule: the indexes never mix. A query embedded with the primary model searches the primary column. A query embedded with the fallback model searches the fallback column. Mixing vectors from different models would make similarity scores unreliable.

At our scale, the extra storage is a non-issue. The reliability payoff is worth it.

## 🛠 Ingestion is an admin workflow, not a public endpoint

Gaspar doesn’t read website files directly at request time, it reads from Supabase.

That means content has to be ingested first. Local scripts collect site content, Markdown posts, JSON data, private documents, and external snapshots. They split the text into chunks, calculate content hashes, generate embeddings, and write everything to the database.

The content hash is what makes this efficient. Every source has a stable identifier: a slug, a file path, something that doesn’t change even when the content does. Alongside it, Gaspar stores a hash: a short fingerprint of that source’s text, where any change to the content, even a single character, produces an entirely different fingerprint. 🔑

When you update a document and re-ingest it, Gaspar looks it up by that identifier, computes a fresh hash of the new content, and compares it to the one stored last time.

- Hashes match → nothing actually changed → skip it, no re-chunking, no re-embedding.

- Hashes differ → the content changed → re-chunk and re-embed just that source, and store the new hash.

The identifier is what tells Gaspar which source it’s looking at. The hash is what tells Gaspar whether it changed. Together, they mean a 200-page corpus with one updated blog post only reprocesses that one post, not the other 199. Routine updates stay cheap and fast. 💸

This is also where sensitive data gets handled. Private CVs are redacted before indexing. Emails, phone numbers, addresses, URLs, social handles, and known sensitive literals are stripped out. If redaction verification finds something that shouldn’t survive, ingestion fails, the document simply never enters the database.

During development, that strictness can be frustrating, a false alarm means re-running ingestion for no real reason. But for private material, that’s precisely the trade-off you want: a rejected document is a minor inconvenience, a leaked address is not.

## 🎭 Persona as data

One of our favorite design decisions: treating Gaspar’s persona as data, not prose.

The assistant has a name, origin, nationality, preferences, and a short personal profile, all stored in assistant.json and indexed like any other source.

When someone asks, "Are you a real cat?" or "What languages can you speak?" Gaspar retrieves profile and policy context before answering.

This beats hiding everything in a prompt. Prompts are easy to forget and difficult to audit. Data can be versioned, tested, and updated without touching the answer pipeline.

## 💡 What we learned

The quality of a business assistant depends less on the model and more on the knowledge design around it.

- You need source types, not a text dump;

- You need metadata, not just embeddings;

- You need private-source handling, not blind ingestion;

- You need citations and source priority rules, not “whatever matched first”.

The model writes the answer. The corpus decides what the model is allowed to know.
