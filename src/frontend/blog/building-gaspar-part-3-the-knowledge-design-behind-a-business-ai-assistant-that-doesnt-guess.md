---
seoTitle: RAG Knowledge Design for Business Chatbots
slug: building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture
title: Part 3: The knowledge design behind a business AI assistant that doesn’t guess
subtitle: Why embeddings alone aren’t enough and what it actually takes to make an AI assistant trustworthy
intro: Why embeddings alone aren’t enough and what it actually takes to make an AI assistant trustworthy
date: August 16, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 8 min read
mediumUrl: https://medium.com/p/10e7e6206c8e
collection: building-gaspar
collectionTitle: Building Gaspar - Anatomy of a Business AI Assistant
collectionPart: 3
---
Part 3 of “Building Gaspar - Anatomy of a Business AI Assistant.” Read [part two](https://arg.software/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/) for the request pipeline that consumes this corpus.

![Part 3: The knowledge design behind a business AI assistant that doesn’t guess](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-header.webp)

An AI assistant is only as useful as the information it can trust.

A flat dump of a website tends to produce vague retrieval. No evidence invites guesses unless the answer path is constrained. Private documents without selection, redaction, and citation rules create an avoidable disclosure risk.

> When we built Gaspar, the hardest part wasn’t choosing a model. It was deciding what Gaspar should know, how that knowledge should be stored, and which pieces should be allowed to answer which questions.

## 📚 What goes into the corpus

The corpus is the body of information Gaspar can search. Ours isn’t one giant text file, it’s a set of typed sources, each with its own role.

![Business AI assistant knowledge design for reliable RAG answers](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-2.webp)

Gaspar indexes selected public website content: scoped homepage sections, project and partner data, FAQs, About and team profiles, careers, Working With Us, legal pages, links, open-source project data, and blog posts. Blogs matter because many visitor questions are technical, and an article is often the best editorial handoff.

Some sources are structured data rather than page text:

- 🗂 Projects have slugs, metrics, stacks, and explicit reference-ranking metadata;

- 🔗 Site links have explicit contact, booking, social, and form URLs;

- 🐾 Gaspar’s own profile lives in `assistant.json`, so questions like “who are you?” or “where were you born?” are answered from retrieved profile data rather than the model’s imagination;

We also have private or controlled source material:

- 📄 Two locally stored CV PDFs are manually approved for ingestion, redacted, and used only for person-scoped professional evidence;

- 🌐 One allowlisted DesignRush HTML snapshot is reduced to approved commercial facts for named projects and general rate context;

- 🧭 An assistant response-policy source adds explicit capability and handoff constraints.

And that distinction matters: not every source is equal. The answer policy prefers official website data and FAQs, then approved trusted-external facts, person-specific redacted CV evidence, and finally blog articles as technical writing. Blog discussion can demonstrate published knowledge without proving project delivery or one person’s skill. Trusted-external and assistant-policy context also suppress visitor-facing citations.

## 🏷 Why metadata matters

Most people talk about embeddings first. Embeddings are important, but metadata is where a lot of the real quality comes from.

An embedding is a numerical representation of text. It lets the database find chunks with similar meaning. For example, a question about “payment networks” might match a project page that says “financial interoperability,” even if the words aren’t identical.

But embeddings alone don’t cover everything we need.

- If someone asks for the latest article → sort by date, not semantic similarity;

- If they ask about a specific founder → search that person’s evidence, not the whole company corpus;

- If they ask for top projects → rank metadata beats a model’s vague sense of relevance;

The implementation separates source metadata from chunk metadata. `rag_sources` stores source type, source key, title, URL, path, origin, public visibility, content hash, and source-specific metadata such as publication date, `person_key`, `reference_rank`, or `evidence_scope`. `rag_chunks` stores the source ID, chunk index, content, primary and fallback vector columns, and chunk metadata such as character count. Vector-search functions join the two so retrieval receives both levels.

Retrieval strategies use those fields for source-key selection, publication sorting, person scoping, project ranking, evidence filtering, and citation policy before or alongside semantic search. That helps prevent common attribution mistakes, such as treating a company-level stack statement as proof that one specific person has a skill.

## ✂ Chunking: small enough to search, large enough to mean something

Before text enters the vector database, it gets split into chunks: pieces of text that can be embedded and retrieved independently.

Gaspar’s default chunk size is 1,200 characters with 180 characters of overlap. Both values are configurable. The chunker normalizes text, groups paragraphs until the next paragraph would exceed the target, and carries a tail into the next chunk. A single paragraph longer than the target is sliced with the same overlap.

- Too small → the model retrieves fragments that don’t explain enough;

- Too large → the embedding becomes a blurry average of several topics;

- Overlap → prevents important details from getting lost at the edges;

The current implementation does not prepend a title header to every chunk. Instead, each loader shapes the source text before chunking. A blog source begins with `Title`, `Subtitle`, `Published`, and `Topic` lines followed by stripped article text; JSON loaders flatten data with contextual labels; curated team and link sources generate explicit evidence lines.

That source-level preamble gives the first blog chunk strong title and date context, while semantic search can still retrieve later body chunks by topic. For deterministic cases, Gaspar deliberately reads first chunks: latest-post requests, site-link requests, known project references, and current-page source-key lookups do not need to pretend that similarity is the only retrieval tool.

## 🔁 Dual embedding indexes

![RAG knowledge sources for a trustworthy business AI assistant](/images/blog/building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess/part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess-3.webp)

The RAG schema has two 768-dimensional pgvector columns per chunk: `embedding` and `fallback_embedding`. Both providers use configured Gemini embedding models, and query-time code keeps track of which index produced the query vector.

Why two? 🤔

Quota resilience.

Embedding APIs can hit quota limits. At query time, a recognized primary quota-exhaustion error triggers the fallback model and the fallback search function. This improves resilience when fallback vectors are present; it is not a guarantee that every provider failure becomes invisible. Non-quota failures still surface, and a chunk without a fallback vector cannot participate in a fallback search. 🔄

One hard rule: the indexes never mix. A query embedded with the primary model calls `match_rag_chunks`; a query embedded with the fallback model calls `match_rag_chunks_fallback`. Mixing vectors from different models would make similarity scores unreliable.

Ingestion tries the primary model first and then attempts the fallback model. If fallback quota is exhausted after primary succeeds, it stores primary vectors with a null fallback column; if primary quota is exhausted, it can ingest fallback-only vectors. A maintenance script can later rebuild fallback vectors. The database requires at least one of the two columns to be present, not both.

## 🛠 Ingestion is an admin workflow, not a public endpoint

Gaspar doesn’t read website files directly at request time, it reads from Supabase.

That means content has to be ingested first. Explicit CLI scripts collect selected JSON data, Markdown posts, generated policy/profile sources, PDF documents, and allowlisted external snapshots. They normalize and chunk the text, calculate a SHA-256 source hash, generate embeddings, and upsert `rag_sources` and `rag_chunks` through a service-role Supabase client. There is no public ingestion route.

The content hash is what makes routine ingestion efficient. Every source has a stable `(source_type, source_key)` identity. Its SHA-256 hash covers a versioned, normalized envelope: identity, title, URL, origin, visibility, stable metadata, chunk metadata, and normalized content. Local source-file paths are deliberately ignored. This means meaningful source or metadata changes are detected, while some whitespace-only changes normalize away. 🔑

When you re-ingest a source, Gaspar looks it up by that stable identity, computes a fresh hash, and compares it with the stored value.

- Hashes match → nothing actually changed → skip it, no re-chunking, no re-embedding.

- Hashes differ → the source envelope changed → re-chunk, re-embed, and replace that source’s chunks, then store the new hash.

The identifier tells Gaspar which source it is looking at. The hash tells Gaspar whether that source changed. The CLI also requires an explicit selection such as `--all`, `--source`, `--file`, or `--url`, so a one-post update can target that file rather than reprocessing the entire corpus. 💸

This is also where sensitive source data is handled. CVs must live outside `public/` and declare a manually reviewed CV redaction policy. The redactor removes configured literals plus patterns for email addresses, phone numbers, labeled addresses and personal details, URLs, profile lines, and social handles. It then scans the normalized result again; if a configured literal or prohibited pattern survives, loading fails before that document is ingested.

During development, that strictness can be frustrating: a false alarm means reviewing the source and running ingestion again. But for private material, that is precisely the trade-off we want. A rejected document is an inconvenience; an exposed address is worse.

## 🎭 Persona as data

One of our favorite design decisions: treating Gaspar’s persona as data, not prose.

The assistant has a name, origin, nationality, preferences, and a short personal profile in `assistant.json`. The manifest ingests it as the `assistant-profile` source.

When someone asks, “Are you a real cat?” or “What languages can you speak?”, routing selects that source key and reads its first chunk directly. The answer model still follows the shared response policy, but the personal facts come from the profile source.

This beats hiding every personal fact in a prompt. The profile can be versioned, tested, and updated independently, then re-ingested without changing the answer use case.

## 💡 What we learned

The quality of a business assistant depends less on the model and more on the knowledge design around it.

- You need source types, not a text dump;

- You need metadata, not just embeddings;

- You need private-source handling, not blind ingestion;

- You need conservative citation and source-priority rules, not “whatever matched first.”

The model writes the prose. The corpus, retrieval routes, evidence filters, and answer policy jointly define the evidence it receives and the claims the system permits.

Next: [Part 4 - “Guardrails as Architecture: How We Stopped Our Chatbot from Lying About Us”](https://arg.software/blog/building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us/)
