---
seoTitle: How LLM Conversation Memory Actually Works
slug: llms-dont-remember-anything
tag: AI
tags: AI, Architecture
title: LLMs Don’t Remember Conversations. Apps Do.
subtitle: Why AI appears to recall a conversation, where that continuity actually lives, and what it costs
intro: Why AI appears to recall a conversation, where that continuity actually lives, and what it costs
date: September 15, 2026
dateModified: September 26, 2026
reviewedOn: September 26, 2026
readTime: 10 min read
mediumUrl: https://medium.com/p/0a1f8425e64c
---

![LLM conversation history reconstructed inside a context window](/images/blog/llms-dont-remember-anything/llms-dont-remember-anything-header.webp)

Ask a large language model a follow-up question twenty messages into a conversation, and it may answer as if it has been tracking the whole exchange. Share a long document, refer to an early section later, and a capable product may pick the thread back up. It feels like memory.

The continuity is real, but it usually does not mean the model independently remembered an earlier event. During standard inference, the model works with the state made available for the current response: conversation items, instructions, retrieved records, tool results, cached computation, and the model’s trained parameters.

Understanding where each part lives explains why long conversations can become slower or more expensive, why details disappear, and why production AI systems need explicit context and persistence engineering.

## The model is only one part of the conversation

A standard text-generation request does not update a model’s trained weights with your conversation. A bare stateless request has no access to a previous request unless the client or provider makes that earlier state available again.

That surrounding machinery may be a chat interface, an API client, a provider-managed conversation object, or an application-owned memory service. It stores or reconstructs continuity; the model generates a response from the context it receives.

So when an assistant refers to something you said earlier, the useful question is not simply “Did the LLM remember?” It is “Which state did the system preserve, and how did that state reach this inference call?”

## Three different things get called memory

The term “memory” is used for several distinct mechanisms:

1. **Parametric knowledge:** A model’s trained weights encode learned statistical patterns and knowledge. Research literature commonly calls this *parametric memory*. Those weights normally remain fixed during inference, although a provider can later deploy a newly trained or fine-tuned model. Typing “I only write C#” into a chat does not itself rewrite them.

2. **The context window:** The current request contains instructions, messages, documents, tool results, and space for the output. This is often described as working memory. It is temporary and bounded, but it is real state available to the model while producing that response.

3. **Persistent application state:** Messages, summaries, preferences, files, structured facts, or vector records can live outside the model. An application or provider can retrieve selected items and make them available in a later request, including across separate chats.

The third mechanism creates the persistent conversational memory users usually mean. It belongs to the product around the model, even when the provider manages it behind a simple API.

![Parametric knowledge, context window, and persistent application memory](/images/blog/llms-dont-remember-anything/ai-people-group-these-three-things-together-as-memory-technical-illustration-2.webp)

## A bare stateless request

Imagine sending this request to a stateless text-generation endpoint:

```text
User: "My name is Rui."
```

The model replies using the name. Now send a separate request containing only:

```text
User: "What's my name?"
```

The second input contains no answer. The model may guess, refuse, or say it does not know, but the earlier statement is not available to it.

To make the follow-up answerable, the client can include the earlier exchange:

```text
User: "My name is Rui."
Assistant: "Nice to meet you, Rui!"
User: "What's my name?"
```

Now “Rui” is part of the current context. OpenAI’s [conversation-state documentation](https://developers.openai.com/api/docs/guides/conversation-state) describes both approaches: manually supplying previous items and using provider-managed conversation objects or response IDs. In the latter case, the client does not have to resend every message itself, but previous state is still being retained and made available by the surrounding system.

Some products add another layer. ChatGPT, for example, documents [saved memories and references to chat history](https://help.openai.com/en/articles/8590148-memory-faq). A preference can therefore survive a closed chat when that product feature is enabled. That is product-level persistence, not a conversation rewriting the base model’s weights.

## Reconstructed context is still useful continuity

None of this makes a good conversational experience fake. If an application recalls that you chose PostgreSQL over MongoDB fifteen messages ago and tailors its answer accordingly, that is useful continuity.

> A precise description is reconstructed context backed by retained state.

The implementation might replay messages, reference a provider-managed thread, retrieve a structured decision, restore cached model state, or combine several of those techniques. The important distinction is that the system deliberately carries state across calls.

## Why full-history conversations become costly

Consider a simple implementation that retains the complete conversation and adds roughly 1,000 tokens per turn. The input to turn 1 is about 1,000 tokens, turn 5 about 5,000, and turn 10 about 10,000.

Across those ten requests, the cumulative input is approximately:

```text
1,000 + 2,000 + ... + 10,000 = 55,000 tokens
```

![Per-turn and cumulative token processing for a growing full-history conversation](/images/blog/llms-dont-remember-anything/ai-why-this-makes-long-conversations-slow-and-costly-technical-illustration-3.webp)

That does not mean every product always pays the same price or repeats all computation. Provider pricing, retained-state APIs, truncation, compaction, and caching change the result. OpenAI currently notes, for example, that chains using `previous_response_id` still bill previous input tokens, while cached prefixes can receive a lower input rate.

[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) can reuse key-value states calculated for an unchanged prefix. This can reduce processing, latency, and input cost. It does not make the context free or permanent: cache entries expire, require matching prefixes, and the cached tokens still occupy the request’s context window.

Context windows are finite. Depending on the model and API, instructions, messages, documents, tool definitions and results, output, and reasoning tokens can compete for the same capacity. Anthropic’s [context-window documentation](https://platform.claude.com/docs/en/build-with-claude/context-windows) describes this accumulation and recommends compaction for long-running conversations.

More context is not automatically better context either. The peer-reviewed [Lost in the Middle](https://arxiv.org/abs/2307.03172) study found that model performance can change significantly depending on where relevant information appears in a long input. Current models and providers continue to improve, but teams should measure whether a model can find and use the important evidence, not assume that fitting it into the window is enough.

## What happens near the limit

Products use different strategies to control context growth:

- **Trimming:** Drop older messages when a limit is reached.
- **Summarization:** Replace older exchanges with a shorter account of the important points.
- **Compaction:** Produce a smaller state representation that can continue a long-running session.
- **Selective retrieval:** Fetch only past items that appear relevant to the current request.

A summary might say:

> The user is building an invoicing service in TypeScript, chose PostgreSQL over Redis, and is debugging duplicate invoice creation under concurrent requests.

That can work, but summaries can fall short. Summarization is interpretation rather than lossless preservation. A detail that seemed unimportant when the summary was created can become important later, and repeated summarization can introduce drift.

## The toolbox used by long-running products

Systems that need reliable continuity commonly combine several techniques:

**Sliding window:** Keep the most recent turns and drop older ones. This is simple and bounded, but information outside the window is unavailable unless another mechanism restores it.

**Rolling summarization:** Periodically compress older turns while preserving recent exchanges in full. This extends continuity at the cost of detail and introduces another generated artifact that may need evaluation.

**Structured extraction:** Store selected facts and decisions in explicit fields:

```json
{
  "preferred_language": "TypeScript",
  "database": "PostgreSQL",
  "current_project": "invoice service",
  "confirmed_decisions": ["use optimistic concurrency", "avoid Redis"]
}
```

This makes known fields easier to validate and update than facts buried in prose. It captures only what the extraction policy and schema ask for, so narrative context may still require another representation.

**Semantic retrieval:** Convert retained fragments into embeddings so the system can search by similarity rather than exact wording. The original [retrieval-augmented generation paper](https://arxiv.org/abs/2005.11401) distinguishes the model’s parametric memory from an explicit non-parametric index. Retrieval can surface a relevant earlier decision without loading the entire history, but it can also miss the right fragment or return a merely similar one.

**Long-term profiles:** Store durable preferences or facts and selectively include them later. These systems need provenance, user controls, correction and deletion paths, and rules for stale or conflicting information. Repeated confirmation can increase confidence, but an explicit user instruction or authoritative source may be stronger than frequency alone.

## How continuity crosses separate chats

One common cross-chat flow looks like this:

- During or after a chat, a process identifies information worth retaining.
- The system writes it to a store associated with the user, project, or organization.
- In a later conversation, the application searches for relevant retained information.
- Selected items are inserted into or otherwise made available to the current context.
- The model generates a response from that assembled state.

![Application-managed memory retrieved into a later conversation](/images/blog/llms-dont-remember-anything/ai-how-memory-survives-across-separate-chats-technical-illustration-4.webp)

The retrieval step is the key. The model is not independently browsing an internal archive of your previous sessions. The surrounding system decides what can be stored, what should be fetched, and what the model receives. Systems such as [MemGPT](https://arxiv.org/abs/2310.08560) explore this explicitly by moving information between bounded context and external memory tiers.

Persistence also creates responsibilities that a simple chat demo can avoid. Personal memories may be incorrect, sensitive, outdated, or shared in a context where the user did not expect long-term storage. A production design should define consent, tenancy, retention, correction, deletion, provenance, and access controls alongside retrieval quality.

## The takeaway

Model weights hold parametric knowledge. The context window holds the state available for the current response. Persistent history and preferences live in provider or application systems that decide what to retain and what to make available later.

So “LLMs have no memory” is a useful shortcut only when it means that a standard inference call does not independently preserve your conversation or rewrite its own weights. Taken literally, it hides important distinctions between parametric knowledge, working context, caches, and external persistence.

The quality of an AI product’s memory depends on more than the underlying model. It depends on how carefully the surrounding system stores, retrieves, validates, expires, and forgets information.

## Sources reviewed

- [OpenAI, Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) - stateless requests, manual history, provider-managed conversations, response chaining, billing, and context limits;
- [OpenAI, Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) - reusable key-value states, prefix matching, cache lifetime, latency, and input cost;
- [OpenAI, Memory in ChatGPT](https://help.openai.com/en/articles/8590148-memory-faq) - saved memories, chat-history references, user controls, and deletion behavior;
- [Anthropic, Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) - context accumulation, token capacity, context quality, and compaction;
- [Liu et al., Lost in the Middle](https://arxiv.org/abs/2307.03172) - measured long-context retrieval performance and sensitivity to information position;
- [Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) - parametric and non-parametric memory terminology;
- [Packer et al., MemGPT](https://arxiv.org/abs/2310.08560) - external memory tiers and virtual context management for long-running conversations.
