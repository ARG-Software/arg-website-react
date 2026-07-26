# RAG Refactor Plan

## Goal

Make the RAG assistant code easier to understand, test, and change before adding more bug fixes.

The current issue is structural: factual retrieval bugs are being fixed by adding more conditions and source text, while the runtime still depends too much on vector ranking, broad type files, mixed concerns, and direct Supabase access across several modules.

The refactor should make the codebase answer this question cleanly:

> If a term already exists in indexed first-party data, why does retrieval sometimes fail to use it?

## Current Problems

- `rag/runtime/ask.ts` is doing orchestration, planning normalization, technology subject splitting, retrieval item creation, fallback answer generation, context merging, and response assembly.
- `rag/prompts/answering.ts` contains intent prompts, retrieval-plan prompts, answer prompts, insufficient-context prompts, fallback prompts, prompt parsing, history formatting, and context formatting.
- Runtime retrieval imports and uses `SupabaseClient` directly in several files.
- There is a write-side repository for ingestion, but no read-side runtime repository boundary.
- Tests live beside production code instead of under a dedicated test folder.
- Scripts live under runtime and ingestion folders instead of a dedicated scripts folder.
- Type files are broad and overlapping. `types/ai.ts` contains providers, chat messages, retrieval plans, contexts, citations, actions, and final output shapes.
- Supabase row types leak into runtime retrieval code.
- Exact technology questions are mostly handled through semantic vector retrieval first, then exact filtering. If the exact official source chunk is not in the vector top results, the assistant can say it cannot confirm a technology that exists in the database.
- Multi-technology questions are capped too low, so later technologies can be silently skipped.

## Non-Goals

- Do not rewrite the whole RAG system in one step.
- Do not change providers away from Gemini, DeepSeek, or Supabase.
- Do not patch stack facts into FAQ as the primary fix.
- Do not clear RAG tables unless explicitly required and approved.
- Do not mix retrieval bug fixes into the first pure-move refactor phase.

## Target Structure

```text
rag/
  core/
    types/
      actions.ts
      chat.ts
      config.ts
      context.ts
      ingestion.ts
      output.ts
      providers.ts
      retrieval.ts
      source.ts
    normalization/
    errors/
  prompts/
    answering.ts
    contextFormatting.ts
    fallback.ts
    insufficientContext.ts
    intent.ts
    parsers.ts
    responseLanguage.ts
    retrievalPlan.ts
  providers/
    AnswerProvider.ts
    EmbeddingProvider.ts
    deepseek/
    gemini/
  repositories/
    RagReadRepository.ts
    RagWriteRepository.ts
    supabase/
      SupabaseRagReadRepository.ts
      SupabaseRagWriteRepository.ts
      rows.ts
  ingestion/
    extractors/
    loaders/
    pipeline/
    processing/
  runtime/
    askQuestion.ts
    intent/
    planning/
    retrieval/
      strategies/
      technology/
    response/
  scripts/
    ask.ts
    ingestExternal.ts
    ingestLocal.ts
    rebuildFallbackEmbeddings.ts
  tests/
    evals/
    fixtures/
    fakes/
    ingestion/
    runtime/
```

This exact layout can be adjusted during implementation, but these boundaries should remain:

- Runtime orchestration should not know Supabase table names or RPC names.
- Prompt modules should be separated by purpose.
- Tests and scripts should not live inside production folders.
- Provider interfaces should not be mixed with output, source, or database row types.

## Phase 1: Move Tests And Scripts Only

Purpose: reduce clutter without changing behavior.

Move tests:

```text
rag/runtime/ask.test.ts              -> rag/tests/runtime/askQuestion.test.ts
rag/runtime/evalCases.test.ts        -> rag/tests/runtime/evalCases.test.ts
rag/ingestion/ingestPipeline.test.ts -> rag/tests/ingestion/ingestPipeline.test.ts
rag/evals/cases.ts                   -> rag/tests/evals/cases.ts
```

Move scripts:

```text
rag/runtime/scripts/testAsk.ts                    -> rag/scripts/ask.ts
rag/ingestion/scripts/ingestLocal.ts              -> rag/scripts/ingestLocal.ts
rag/ingestion/scripts/ingestExternal.ts           -> rag/scripts/ingestExternal.ts
rag/ingestion/scripts/rebuildFallbackEmbeddings.ts -> rag/scripts/rebuildFallbackEmbeddings.ts
rag/ingestion/scripts/cli.ts                      -> rag/scripts/cli.ts
```

Update `package.json`:

```json
{
  "rag:ingest:local": "tsx rag/scripts/ingestLocal.ts",
  "rag:ingest:external": "tsx rag/scripts/ingestExternal.ts",
  "rag:embeddings:rebuild:fallback": "tsx rag/scripts/rebuildFallbackEmbeddings.ts",
  "rag:ask:test": "tsx rag/scripts/ask.ts",
  "rag:test": "tsx --test rag/tests/**/*.test.ts"
}
```

Verification:

```bash
npm run typecheck:rag
npm run rag:test
npm run lint:rag
```

## Phase 2: Split Types By Domain

Purpose: make imports communicate intent and stop unrelated concepts from changing together.

Create focused type files under `rag/core/types/` or a similar location:

```text
chat.ts       ChatMessage, PageContext, PromptMessage
providers.ts AnswerProvider, EmbeddingProvider
retrieval.ts RetrievalMode, RetrievalPlan, RetrievalQuestionPlan, RetrievalRoute, MatchFunction
context.ts   RetrievedContext
output.ts    AskQuestionResult, Citation, ArticleRecommendation
actions.ts   AssistantAction, AssistantActionType
source.ts    RagSource, RagSourceType, RagSourceOrigin, RagSourceMetadata
config.ts    RagConfig, EnvOptions
```

Rules:

- Supabase row types must not live in generic `types/` files.
- Test-only row types must move to `rag/tests/fakes/` or `rag/tests/fixtures/`.
- Provider interfaces should be independent of provider implementations.
- Runtime modules should import domain types, not database row types.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
```

## Phase 3: Add Runtime Read Repository Boundary

Purpose: remove direct Supabase access from runtime retrieval.

Keep the ingestion write repository concept, but split it clearly from runtime reads.

Create:

```ts
export interface RagReadRepository {
  findSources(input: FindSourcesInput): Promise<RagSourceRecord[]>;
  findFirstChunksForSources(sources: RagSourceRecord[]): Promise<RetrievedContext[]>;
  matchChunks(input: MatchChunksInput): Promise<RetrievedContext[]>;
  findChunksByText(input: FindChunksByTextInput): Promise<RetrievedContext[]>;
}

export interface RagWriteRepository {
  getSourceContentHash(source: Pick<RagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: RagSource, embeddings: RagSourceEmbeddings): Promise<UpsertSourceResult>;
  updateFallbackEmbeddings(source: RagSource, embeddings: number[][]): Promise<UpsertSourceResult>;
}
```

Runtime methods that should move behind `RagReadRepository`:

- `retrieveSources()`
- `retrieveFirstChunksForSources()`
- `retrieveLatestBlogContexts()` Supabase query
- `retrieveContextsForOrigin()` / RPC calls
- direct `.from('rag_sources')`, `.from('rag_chunks')`, and `.rpc(...)` calls

After this phase, these runtime files should not import `SupabaseClient`:

```text
rag/runtime/ask.ts
rag/runtime/retrieval/*.ts
```

Only Supabase repository implementations should import `SupabaseClient`.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
npm run rag:ask:test -- "What does ARG Software do?"
```

## Phase 4: Split Prompt Code

Purpose: prompts should be readable and independently testable.

Split `rag/prompts/answering.ts` into:

```text
intent.ts              buildIntentPrompt, intent fallback prompt if appropriate
retrievalPlan.ts       buildRetrievalPlanPrompt
answering.ts           buildSystemPrompt for final grounded answers
insufficientContext.ts buildInsufficientContextPrompt
fallback.ts            buildIntentFallbackPrompt
contextFormatting.ts   buildUserPrompt, buildHistoryMessages, buildPageContextMessages
responseLanguage.ts    buildResponseLanguageInstruction
parsers.ts             parseIntentResponse, parseRetrievalPlan
```

Rules:

- Prompt builders only build prompt strings.
- Parsers only parse model responses.
- Context formatting is not part of answer policy text.
- DeepSeek client composes prompt modules but does not own prompt content.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
```

## Phase 5: Shrink Runtime Orchestration

Purpose: make `askQuestion` read as a flow, not a collection of implementation details.

Target `askQuestion` flow:

```text
create runtime context
classify intent
if non-RAG, return fallback
create retrieval plan
resolve retrieval routes
retrieve contexts
if no contexts, create insufficient answer
generate grounded answer
return formatted output
```

Move logic out of `ask.ts` into modules:

```text
runtime/planning/createRetrievalItems.ts
runtime/planning/technologySubjects.ts
runtime/retrieval/retrieveForPlan.ts
runtime/response/buildAnswerQuestion.ts
runtime/response/createAnswer.ts
runtime/response/actions.ts
runtime/response/citations.ts
runtime/response/recommendations.ts
runtime/response/unconfirmedTechnologyAnswer.ts
```

Move these specific functions/constants out of `ask.ts`:

- `createRetrievalItems`
- `createTechnologySubjectItems`
- `splitTechnologySubjects`
- `createTechnologySupportQuery`
- `createSemanticEmbeddings`
- `mergeRetrievedContexts`
- `mergeArticleRecommendations`
- `buildAnswerQuestion`
- `createUnconfirmedTechnologyAnswer`
- technology regex constants
- technology display-name map

Definition of done:

- `ask.ts` or `askQuestion.ts` is mostly orchestration.
- It should ideally be under 150 lines.
- It should not import `SupabaseClient`.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
```

## Phase 6: Split Retrieval Into Strategies

Purpose: make retrieval behavior explicit and easier to fix.

Target structure:

```text
runtime/retrieval/
  route.ts
  retrieve.ts
  strategies/
    editorial.ts
    exactTechnology.ts
    latestBlog.ts
    personProfile.ts
    semanticDirectEvidence.ts
  technology/
    normalizeTechnology.ts
    splitTechnologyQuestion.ts
    technologyEvidence.ts
```

Strategy responsibilities:

- `latestBlog`: direct newest-post lookup, no embeddings.
- `personProfile`: exact source lookup for named people and their allowed public/private evidence.
- `exactTechnology`: lexical/exact term lookup first, vector fallback second.
- `semanticDirectEvidence`: normal factual retrieval using vector search.
- `editorial`: blog/editorial retrieval only.

Rules:

- Official/project/FAQ/policy evidence should be preferred over blog evidence for company capabilities.
- Blog evidence can support technical knowledge/editorial coverage, but should not override first-party capability evidence.
- Exact technology questions should not fail just because the official chunk is not in the vector top N.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
```

## Phase 7: Build Shared Test Fakes And Fixtures

Purpose: remove duplicated fake Supabase clients and make tests target domain behavior.

Create:

```text
rag/tests/fakes/FakeAnswerProvider.ts
rag/tests/fakes/FakeEmbeddingProvider.ts
rag/tests/fakes/FakeRagReadRepository.ts
rag/tests/fakes/FakeRagWriteRepository.ts
rag/tests/fixtures/config.ts
rag/tests/fixtures/sources.ts
rag/tests/fixtures/contexts.ts
```

Rules:

- Runtime tests should use `FakeRagReadRepository`, not fake Supabase clients.
- Repository implementation tests can use a Supabase-shaped fake if needed.
- Eval cases should use shared fakes.
- Tests should assert behavior, not internal RPC call shape, except repository implementation tests.

Verification:

```bash
npm run rag:test
```

## Phase 8: Fix Exact Technology Retrieval Cleanly

Purpose: solve the Kubernetes/Docker/.NET/Angular/React problem without adding duplicate FAQ text.

Add technology normalization:

```text
kubernettes -> Kubernetes
k8s -> Kubernetes
kubernetes -> Kubernetes
docker -> Docker
.net -> .NET
dotnet -> .NET
asp.net -> ASP.NET Core / .NET
react -> React
angular -> Angular
```

Exact technology retrieval should:

1. Split compound technology questions into all requested technologies, not only the first three.
2. For each normalized technology, search indexed chunks lexically/exactly first.
3. Search authoritative source types first:
   - `working_with_us`
   - `project`
   - `faq`
   - `homepage`
   - `about`
4. Use vector search as fallback.
5. Use blog evidence only if no official/project evidence exists, and word the answer as technical knowledge/editorial coverage rather than project delivery.

Add regression tests:

```text
Do you use Kubernetes?
Do you use Docker?
Do you use .NET?
Do you use Angular?
Do you use React?
And .net? or angular? or react? also do you use kubernettes or docker?
```

Expected behavior:

- The assistant confirms `.NET`, Angular, React, Docker, and Kubernetes when those terms exist in indexed first-party sources.
- The answer cites official/project sources where available.
- The answer should not require adding duplicate technology text to FAQ.

Verification:

```bash
npm run typecheck:rag
npm run rag:test
npm run lint:rag
npm run rag:ask:test -- "And .net? or angular? or react? also do you use kubernettes or docker?"
```

## Phase 9: Re-Index Only After Source Or Chunking Changes

Run re-indexing after changes that affect loaded content, chunking, source generation, metadata, or repository query behavior requiring new stored data.

Use:

```bash
npm run rag:ingest:local -- --all --refresh
```

Do not clear RAG tables unless explicitly required.

## Final Verification Checklist

Run before considering the refactor complete:

```bash
npm run typecheck:rag
npm run rag:test
npm run lint:rag
npm run build
npm run rag:ask:test -- "Do you use Kubernetes?"
npm run rag:ask:test -- "Do you use Docker?"
npm run rag:ask:test -- "And .net? or angular? or react? also do you use kubernettes or docker?"
```

## Definition Of Done

- Tests live under `rag/tests/`.
- Scripts live under `rag/scripts/`.
- Prompt files are split by topic.
- Runtime retrieval does not import `SupabaseClient`.
- Supabase table names and RPC names are isolated inside Supabase repository implementations.
- Type files are focused by domain.
- `askQuestion` is a thin orchestrator.
- Retrieval strategies are explicit and individually testable.
- Technology retrieval uses existing indexed database content instead of requiring FAQ duplication.
- The Kubernetes/Docker/.NET/Angular/React regression questions pass.

## Suggested First Session Prompt

Use this prompt in the next session:

```text
Read docs/rag-refactor-plan.md and start Phase 1 only. Move RAG tests to rag/tests and scripts to rag/scripts, update package.json scripts, and run typecheck/rag tests/lint. Do not change retrieval behavior yet.
```
