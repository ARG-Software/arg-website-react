# RAG Session Handoff

## Current Goal

Build a RAG assistant for the ARG Software website.

Target architecture:

- Gemini for embeddings.
- Supabase + pgvector for storage/retrieval.
- DeepSeek for final answer generation.
- Netlify Functions for the public `ask` API endpoint only.
- Local/admin ingestion scripts for local and external sources.

## Decisions Made

- Use Gemini Embedding 2 as the primary index and Gemini Embedding 1 as a separate fallback index. Never compare vectors across models.
- Use Gemini embeddings and DeepSeek generation.
- Use Supabase for database/vector search only.
- Use Netlify Functions instead of Supabase Edge Functions for runtime API calls.
- Manage Supabase schema through repo migrations.
- Do not expose API keys in frontend code.
- Ingest local first-party and trusted external sources separately.
- Prefer canonical JSON/Markdown/PDF sources over scraping JSX/components.
- Start external scraping from a manual allowlist, not an open crawler.
- Run ingestion locally/admin-side, not as Netlify Functions.

## Environment Variables

Expected local/server env vars:

```env
DATABASE_URL=
DATABASE_PROJECT_REF=
DATABASE_ACCESS_TOKEN=
DATABASE_SERVICE_ROLE_KEY=

EMBEDDING_API_KEY=
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=768
FALLBACK_EMBEDDING_MODEL=gemini-embedding-001
FALLBACK_EMBEDDING_DIMENSIONS=768
EMBEDDING_REQUEST_DELAY_MS=750

AI_MODEL_API_KEY=
AI_MODEL=deepseek-v4-flash
```

Optional later:

```env
RAG_SITE_URL=https://arg.software
RAG_COMPANY_NAME=ARG Software
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=180
RAG_MATCH_COUNT=6
RAG_SIMILARITY_THRESHOLD=0.72
```

## Completed Refactor

Committed as:

- `b89d325 refactor(content): extract canonical site data`

Created canonical data files for content that RAG can ingest directly:

- `src/data/homepage.json`
- `src/data/faq.json`
- `src/data/careersPage.json`
- `src/data/partnersPage.json`
- `src/data/workingWithUs.json`
- `src/data/site.json`

Removed obsolete/non-canonical data files:

- `src/data/faq.js`
- `src/data/services.json`
- `src/data/techStackConsole.json`
- `src/data/projectGallery.js`

Moved project gallery config/helper to:

- `src/constants/projectGallery.js`

Updated these areas to consume JSON data:

- Homepage and all homepage sections.
- FAQ UI and FAQ schema data.
- Careers page copy.
- Partners page copy.
- Working With Us page copy.
- Tech stack console data.
- Footer services/tagline.
- SEO prerender homepage FAQ schema.

Verification completed:

- `npm run lint` passes.
- `npm run build` passes, including SEO prerender.

## Important Notes

- `.env` is already ignored by git.
- `.env.example` is trackable by `.gitignore` and was included in the canonical-data refactor commit.
- `public/files/portfolio.pdf` exists and should be included in local ingestion.
- The first RAG implementation should ingest internal data without scraping rendered React.
- Ingestion should run via local/admin scripts, not deployed Netlify Functions.
- `@supabase/supabase-js` should remain in production `dependencies` for the deployed `ask` function.
- `dotenv`, `cheerio`, and `pdf-parse` should remain in `devDependencies` because they support local/admin ingestion scripts.
- RAG config JSON files live under `rag/config/`.
- Supabase CLI helper lives under `supabase/scripts.js`, not under `rag/`.
- The current `.env` has a valid `AI_MODEL_API_KEY`; full answer generation has been verified locally.

## Local Ingestion Sources

Use these for the local ingestion endpoint/script:

- `src/data/homepage.json`
- `src/data/about.json`
- `src/data/projects.json`
- `src/data/partners.json`
- `src/data/partnersPage.json`
- `src/data/jobs.json`
- `src/data/careersPage.json`
- `src/data/workingWithUs.json`
- `src/data/faq.json`
- `src/blog/*.md`
- Local documents listed in `rag/config/localSources.ts`.

Default local documents:

- `public/files/portfolio.pdf`

Do not ingest:

- `src/constants/projectGallery.js`
- UI animation/config-only data.
- 404 page copy.

## Runtime Endpoint

Netlify Functions are used only for asking questions:

- `POST /.netlify/functions/ask`

Implemented at:

- `netlify/functions/ask.js`
- Shared runtime is TypeScript at `rag/runtime/ask.ts`.

Request body:

```json
{
  "question": "What does ARG Software do?",
  "messages": [
    {
      "role": "user",
      "content": "What external profiles mention ARG Software?"
    },
    {
      "role": "assistant",
      "content": "DesignRush, GoodFirms, TechBehemoths, and LinkedIn."
    }
  ],
  "sourceTypes": ["homepage", "project"]
}
```

`messages` and `sourceTypes` are optional. `messages` supports recent `user`/`assistant` turns for conversational follow-up questions. The function returns:

```json
{
  "answer": "...",
  "citations": []
}
```

The function handles:

- `OPTIONS` preflight.
- `POST` only.
- JSON body validation.
- Question required / max 1000 characters.
- Optional conversation history validation.
- Client validation errors return stable error codes under `error.code`; frontend should localize validation/UI errors from those codes.
- DeepSeek classifies each request as `small_talk`, `rag_question`, or `unsupported` before retrieval.
- Small talk and unsupported requests return direct same-language responses without Gemini embeddings or Supabase retrieval.
- Unsupported requests are politely redirected to ARG Software website topics. Technical service enquiries also include meeting and email actions so prospective clients can share their requirements.
- General technical insight questions retrieve ARG blog posts and can return up to two article recommendations. Recommendations are suppressed only when the user explicitly cites an ARG project.
- DeepSeek rewrites/translates every question into a standalone English retrieval query before embedding.
- Follow-up question reference resolution before retrieval when history is provided.
- Answers are generated in the same language as the latest user question.
- Valid questions with no retrieved context use a DeepSeek-generated same-language insufficient-context response.
- Safe public error responses for server errors.

Validation error response shape:

```json
{
  "error": {
    "code": "question_required",
    "message": "Question is required"
  }
}
```

Known validation error codes:

- `invalid_json`
- `question_required`
- `question_too_long`
- `source_types_invalid`
- `messages_invalid`
- `message_invalid`
- `message_role_invalid`
- `message_content_invalid`
- `message_content_required`
- `message_content_too_long`

Do not add Netlify ingestion endpoints unless the architecture changes again.

## Local Ingestion Scripts

Use local/admin scripts for ingestion:

- local ingestion for JSON/Markdown/PDF.
- external ingestion for allowlisted URLs.

These scripts should use local/server env vars and must not expose service-role or AI provider keys to frontend code.

Implemented scripts:

- `npm run rag:ingest:local`
- `npm run rag:ingest:external`
- Both support `--dry-run`.
- External allowlist lives at `rag/config/externalSources.ts`.

## Database Schema

Supabase migration exists under `supabase/migrations/`.

Expected objects:

- Enable `vector` extension.
- `rag_sources` table.
- `rag_chunks` table.
- Vector index on `rag_chunks.embedding`.
- RPC function `match_rag_chunks`.

Recommended source types:

- `homepage`
- `about`
- `project`
- `partner`
- `careers`
- `working_with_us`
- `faq`
- `blog_post`
- `local_document`
- `external_page`

## External Sources

Use the curated allowlist module:

- `rag/config/externalSources.ts`

Current approved sources:

- `https://www.designrush.com/agency/profile/arg-software`
- `https://www.goodfirms.co/company/arg-software`
- `https://techbehemoths.com/company/arg-software`
- `https://www.linkedin.com/company/arg-software/`
- `https://github.com/marmelo/tech-companies-in-portugal/blob/master/README.md`

Suggested format:

```json
[
  {
    "url": "https://example.com/page-about-arg",
    "title": "Optional source title",
    "trusted": true
  }
]
```

External ingestion should:

- Fetch only manually approved URLs.
- Extract readable text from HTML.
- Store citation URL/title/domain.
- Upsert by URL.
- Avoid touching internal sources.

## Local Document Sources

Add repeatable local document ingestion sources to:

- `rag/config/localSources.ts`

Required fields:

```json
{
  "format": "pdf",
  "filePath": "public/files/example.pdf",
  "sourceKey": "example-pdf",
  "title": "Example PDF",
  "citationUrl": "/files/example.pdf",
  "documentKind": "portfolio"
}
```

CVs must use a manually reviewed `redaction` policy, stay outside `public/`, and cite a public profile page rather than the raw document. Only redacted extracted text is embedded.

## Next Implementation Steps

1. Add dependencies: done and committed.
   - `@supabase/supabase-js@^2.58.0` in `dependencies`.
   - `dotenv@^17.4.2` in `devDependencies`.
   - `pdf-parse@^2.4.5` in `devDependencies`.
   - `cheerio@^1.2.0` in `devDependencies`.
   - Supabase was pinned to `^2.58.0` because newer `2.110.x` releases declare a Node 22 engine floor while Netlify is configured for Node 20.

2. Add Supabase files: done, pushed to Supabase, and committed.
   - `supabase/config.toml`
   - `supabase/migrations/20260722000000_create_rag_schema.sql`

3. Add shared RAG modules: done and committed.
   - Files are TypeScript and grouped under `rag/config/`, `rag/clients/`, `rag/repositories/`, `rag/ingestion/processing/`, `rag/ingestion/sources/`, `rag/types/`, and `rag/utils/`.
   - env validation.
   - Supabase server client.
   - `GeminiEmbeddingClient` implements the provider-neutral `EmbeddingClient` interface.
   - `DeepSeekAnswerClient` implements the provider-neutral `AnswerClient` interface.
   - `SupabaseRagSourceRepository` implements the provider-neutral `RagSourceRepository` interface.
   - Shared RAG types are split by intent: `config`, `ingestion`, `embeddings`, and `aiClient`.
   - chunking helpers.
   - source/chunk persistence helpers behind the repository interface.
   - JSON flattening helpers.
   - Markdown loading helpers.
   - PDF extraction helper.
   - external HTML extraction helper.

4. Add ingestion scripts: done and committed.
   - internal ingestion for JSON/Markdown/PDF.
   - external ingestion for allowlisted URLs.
   - do not implement these as Netlify Functions.
   - `projects.json` is split into one `project` source per project.
   - `partners.json` is split into one `partner` source per partner.
   - Internal PDFs are read from `rag/config/internal-pdfs.json`.
   - Both ingestion scripts support `--dry-run`.
   - Embeddings use `gemini-embedding-2` with `EMBEDDING_DIMENSIONS=768`.
   - Embedding requests are throttled with `EMBEDDING_REQUEST_DELAY_MS=750` to stay under free-tier RPM limits.
   - Internal ingestion has been run successfully: 60 sources and 412 chunks in Supabase.

5. Add ask function: done and committed.
   - embed user question with Gemini.
   - call Supabase RPC.
   - send retrieved context to DeepSeek.
   - return answer plus citations.
   - Shared runtime lives at `rag/runtime/ask.ts`.
   - Local test script lives at `rag/runtime/scripts/testAsk.ts`.
   - Netlify endpoint lives at `netlify/functions/ask.js`.
   - Retrieval-only smoke test passes.
   - Full generation smoke test passes with the current `AI_MODEL_API_KEY`.
   - Optional conversation history is supported through `messages`.
   - Bounded small talk is handled by DeepSeek intent classification before retrieval.
   - Unsupported off-topic requests are redirected before retrieval.
   - Questions are rewritten/translated into standalone English retrieval queries before embedding.
   - Follow-up questions use conversation history to resolve references before retrieval.
   - Answers preserve the latest user question language while keeping names, URLs, and citation titles unchanged.
   - Valid no-context responses are generated in the latest user question language.
   - API validation errors use stable `error.code` values for frontend localization instead of returning raw messages as the localization contract.

6. Add npm scripts for local/admin workflows: done.
   - `rag:ingest:internal`
   - `rag:ingest:external`
   - `rag:ask:test`
   - `supabase:link`
   - `supabase:push`
   - Supabase scripts use `supabase/scripts.js` so `.env` values are loaded automatically.

7. Move RAG config files and Supabase helper: done and committed.
   - `rag/config/externalSources.ts`
   - `rag/config/internal-pdfs.json`
   - `supabase/scripts.js`
   - Old paths removed: `rag/external-sources.json`, `rag/internal-pdfs.json`, `rag/scripts/supabase.js`.
   - `supabase/scripts.js` loads `.env` directly with `dotenv`; it does not import from `rag/`.

8. Update lint coverage: done.
    - `package.json` now lints `src`, `plugins`, `rag`, `supabase/scripts.js`, and `netlify/functions`.

9. Convert RAG runtime/ingestion to TypeScript: done.
   - `tsconfig.rag.json` checks `rag/**/*.ts` with `moduleResolution: NodeNext`.
   - Local scripts now run through `tsx`.
   - `rag/types.ts` was removed in favor of focused type files under `rag/types/`.
   - The only shared interfaces are the replaceable boundaries: `EmbeddingClient`, `AnswerClient`, and `RagSourceRepository`.
   - Provider configs are constructor details on concrete clients, not method-level shared parameter bags.
   - Supabase no longer leaks into the repository interface; it is owned by `SupabaseRagSourceRepository`.
   - `toEmbeddingLiteral()` lives in `rag/utils/embeddings.ts`, not in ingestion persistence code.
   - Verification: `npm run typecheck:rag` and `npx eslint rag --ext .ts` pass.

## Suggested First SQL Shape

Use `vector(768)` with the configured embedding model and `EMBEDDING_DIMENSIONS=768`.

Tables should support:

- source URL/path uniqueness.
- source type filtering.
- metadata JSON.
- chunk ordering.
- citations in answers.

## Frontend Assistant UI (Gaspar)

The frontend assistant widget named **Gaspar** is now implemented.

### Components

- `src/components/widgets/AssistantWidget.jsx` — main widget component
- `src/components/widgets/WidgetManager.jsx` — coordinates email capture + Gaspar
- `src/styles/assistant.css` — all Gaspar widget styles

### How it works

- A floating trigger button (56px circle, dark navy, ARG logo) sits at bottom-right (`z-index: 9996`).
- Clicking it opens a chat panel (380x520px card, `z-index: 9998`) or fullscreen on mobile.
- The panel shows a welcome message from Gaspar, 4 quick prompt buttons, and a message input.
- Questions are sent to `POST /.netlify/functions/ask` with the full conversation history via `messages`.
- Responses include answer text and citation chips (clickable links to sources).
- Conversation history is maintained in React state across the session.
- Users can toggle between card and fullscreen modes; Escape key minimizes the panel.
- On mobile (<=768px), the panel always opens fullscreen.

### Widget coordination

`WidgetManager` renders both `EmailCaptureForm` and `AssistantWidget`. When the email capture card is visible, the Gaspar trigger button is hidden. When the email card is dismissed, the trigger fades in. They share the same bottom-right position but are z-indexed to never collide:

| Element | z-index |
|---|---|
| Gaspar trigger button | 9996 |
| Email capture card | 9997 (unchanged) |
| Gaspar chat panel | 9998 |
| Cookie banner | 9999 (unchanged) |

### Email capture dismiss changes

- The "Do not show this again" checkbox has been removed.
- Clicking the close button (X) now stores a dismiss timestamp in `localStorage` under `arg_lead_capture_dismissed`.
- The card reappears after 2 days (`LEAD_CAPTURE_DISMISS_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000`).
- Successful form submission still permanently suppresses the card via `arg_insights_subscribed`.
- Removed `NEVER_SHOW_LEAD_CAPTURE_KEY` from `src/constants/ui.js`.

### Analytics events

All tracked via `trackAssistantEvent(action, data)` in `src/utils/analytics.js`:

- `assistant_open` — panel opens
- `assistant_close` — panel closes/minimizes
- `assistant_submit` — question submitted
- `assistant_answer` — answer received
- `assistant_error` — error occurred
- `assistant_citation_click` — citation link clicked
- `assistant_quick_prompt` — quick prompt clicked

### Local dev ask endpoint

A Vite dev server middleware in `vite.config.js` handles `POST /.netlify/functions/ask` by calling `askQuestion()` directly. No Netlify CLI or separate server needed — `npm run dev` handles everything.

### Mounting

`WidgetManager` is mounted in `src/main.jsx` as a sibling to `CookieConsent`, outside `<Routes>`, so it persists across all page transitions.

### API contract (unchanged)

```
POST /.netlify/functions/ask
Body: { "question": "...", "messages": [...], "sourceTypes": [...] }
Response: { "answer": "...", "citations": [...] }
Error: { "error": { "code": "...", "message": "..." } }
```

See the Runtime Endpoint section above for full details on error codes and behavior.

## Historical Continuation (Superseded)

The frontend UI is implemented. Remaining work:

- **Deploy**: Configure server-side Netlify environment variables before deploying the ask endpoint:
  - `DATABASE_URL`
  - `DATABASE_SERVICE_ROLE_KEY`
  - `EMBEDDING_API_KEY`
  - `AI_MODEL_API_KEY`
- **External sources**: Optionally add more manually approved external URLs to `rag/config/externalSources.ts` and rerun external ingestion.
- **Polish**: Adjust Gaspar UI/UX based on real usage (typing speed, response formatting, citation display).
- **Commit**: The current working tree has uncommitted changes (Gaspar widget + email capture changes). Commit when ready.

### Uncommitted changes

```
M  src/components/forms/EmailCaptureForm.jsx
M  src/constants/ui.js
M  src/hooks/useLeadCaptureVisibility.js
M  src/main.jsx
M  src/styles/components.css
M  src/utils/analytics.js
M  vite.config.js
?? src/components/widgets/AssistantWidget.jsx
?? src/components/widgets/WidgetManager.jsx
?? src/styles/assistant.css
```

### Verification already completed

- `npm run lint` passes.
- `npm run typecheck:rag` passes.
- `npm run build` passes (including SEO prerender, image optimization).
- `npm run rag:ask:test --retrieve-only -- "What does ARG Software do?"` returns 6 chunks from Supabase.
- `npm run rag:ingest:external -- --dry-run` validates all five approved external sources: 90 chunks planned, 0 failures.
- `npm run rag:ingest:external` ingests all five approved external sources: 90 chunks ingested, 0 failures.
- `npm run rag:ask:test -- "What external profiles mention ARG Software?"` returns a generated answer with citations from DesignRush, GoodFirms, TechBehemoths, and LinkedIn.
- `npm run rag:ask:test -- --external-profile-history "Tell me more about the second one"` verifies conversational follow-up.
- `npm run rag:ask:test -- "Quels profils externes mentionnent ARG Software ?"` verifies French translation.
- `npm run rag:ask:test -- "Que perfis externos mencionam a ARG Software?"` verifies Portuguese translation.
- `npm run rag:ask:test -- "bonjour"` verifies same-language small talk.
- `npm run rag:ask:test -- "write me a Python scraper"` verifies unsupported request redirection.

Useful commands:

```bash
git status --short
npm run lint
npm run typecheck:rag
npm run build
npm run dev                          # starts Vite with local ask middleware
npm run rag:ingest:local             # re-ingest first-party local sources
npm run rag:ingest:external          # re-ingest external sources
npm run rag:ask:test -- "What does ARG Software do?"
npm run rag:ask:test -- "What external profiles mention ARG Software?"
npm run rag:ask:test -- --external-profile-history "Tell me more about the second one"
npm run rag:ask:test -- "Quels profils externes mentionnent ARG Software ?"
npm run rag:ask:test -- "Que perfis externos mencionam a ARG Software?"
npm run rag:ask:test -- "bonjour"
npm run rag:ask:test -- "write me a Python scraper"
```

## Current Continuation

### Latest Session Update - 2026-07-25

- `src/data/about.json` and `src/data/workingWithUs.json` were restored to `HEAD` after an unwanted assistant/data change. `git diff --name-only -- src/data` returned no changes after the restore.
- The RAG runtime was refactored to make `rag/runtime/ask.ts` a small facade instead of a 1000+ line mixed-responsibility file. It now orchestrates intent, route resolution, retrieval, and answer assembly in 191 lines.
- Public imports remain stable: `askQuestion`, `retrieveRelevantChunks`, `RagValidationError`, and `resolveRetrievalRoute` are still exported from `rag/runtime/ask.ts`.
- Retrieval routing is now a typed decision tree in `rag/runtime/retrieval/route.ts` and `rag/runtime/retrieval/retrieve.ts`.
- Input validation, answer cleanup, citations, article recommendations, actions, URL resolution, embeddings, vector search, direct evidence, latest blog retrieval, and Supabase source helpers were split into focused modules.
- This was intended as a behavior-preserving refactor. Do not mix the next behavior changes into the same review unless necessary.

New runtime files added in this session:

```text
rag/runtime/answerOutput.ts
rag/runtime/inputValidation.ts
rag/runtime/url.ts
rag/runtime/retrieval/directEvidence.ts
rag/runtime/retrieval/embeddings.ts
rag/runtime/retrieval/latestBlog.ts
rag/runtime/retrieval/retrieve.ts
rag/runtime/retrieval/route.ts
rag/runtime/retrieval/sources.ts
rag/runtime/retrieval/types.ts
rag/runtime/retrieval/vectorSearch.ts
```

Current RAG runtime layout:

- `rag/runtime/ask.ts`: public facade and high-level ask/retrieve orchestration.
- `rag/runtime/inputValidation.ts`: `question`, `messages`, and `pageContext` normalization plus `RagValidationError`.
- `rag/runtime/answerOutput.ts`: assistant answer normalization, team voice cleanup, citations, article recommendations, actions, and person clarification copy.
- `rag/runtime/url.ts`: shared URL normalization.
- `rag/runtime/retrieval/route.ts`: route decision tree: `latest_blog`, `direct_evidence`, `editorial`, and unresolved-person clarification.
- `rag/runtime/retrieval/retrieve.ts`: route dispatcher that calls latest-blog, direct-evidence, or vector retrieval.
- `rag/runtime/retrieval/directEvidence.ts`: person/company direct evidence lookup, including public profile and same-person CV evidence.
- `rag/runtime/retrieval/latestBlog.ts`: newest dated blog-post retrieval without embeddings.
- `rag/runtime/retrieval/vectorSearch.ts`: RPC vector search, threshold fallback, context merge/deduplication.
- `rag/runtime/retrieval/embeddings.ts`: primary Gemini embedding with fallback-index switch on quota errors.
- `rag/runtime/retrieval/sources.ts`: Supabase source/chunk reads and direct context creation.
- `rag/runtime/retrieval/types.ts`: Supabase row DTOs and match-function type.

Verification completed after the refactor:

- `npm run lint` passes.
- `npm run rag:test` passes: 15 tests, 15 passing.

Current working tree notes:

- `src/data` is clean relative to `HEAD`.
- Several `rag/*` files were already modified before the refactor and remain uncommitted. Do not assume they were all changed in this session.
- This session intentionally changed `rag/runtime/ask.ts` and added the new runtime modules listed above.
- After this handoff edit, `docs/rag-session-handoff.md` is also expected to be modified.

Next behavior work discussed but not implemented in this refactor:

1. Fix plain named-person identity questions like `Who is Jose?` so they route as RAG/person questions instead of possible small talk.
2. Prevent generic person-bio answers from volunteering languages/frameworks unless the visitor asks for them.
3. Add ranked language/framework evidence based on citations/collected source occurrences.
4. Add tests for `Who is Jose?`, generic founder bios without stack mentions, and ranked language/framework answers.

### Current Source Policy

- `fa87efc feat(rag): improve source ingestion and retrieval` is the latest committed RAG baseline.
- The local-document, active-section, and source-authority update is currently uncommitted.
- The local ingestion command is `npm run rag:ingest:local`; the old `rag:ingest:internal` command and `internal-*` configuration files were removed.
- First-party sources use `origin = first_party`; approved web sources use `origin = trusted_external`. The database RPC only returns `is_public = true` sources.
- Every RAG question retrieves matching first-party and trusted external sources in parallel. The runtime keeps the strongest context from each available origin before filling the remaining slots by similarity, so independent information can complement official ARG material without excluding it.
- Current-page project and homepage-section data is used only while rewriting explicit references such as "this project" or "this section". It is not independently retrieved or boosted for unrelated questions.
- Trusted external material can inform an answer but its URLs are never returned as assistant citation chips. Automatic citations are limited to the highest-ranked first-party ARG page or section; booking and email links are returned only as enquiry-relevant assistant actions.
- Answers use ARG's first-person team voice, return plain text, and do not volunteer missing review, rating, profile, or other credibility-damaging absence claims from independent sources.
- External entries require stable `sourceKey`, non-empty title, and explicit `trusted: true`. Fetches reject host-changing redirects and responses over 2 MiB.

### Local Documents And CVs

- Local document entries live in `rag/config/localSources.ts` with `kind: local_document`.
- Local source registry lives in `rag/config/localSources.ts`.
- Supported document format is currently PDF. Documents use the `local_document` source type.
- Portfolio documents may cite their public file URL.
- CVs must be kept outside `public/`, for example under `.rag-private/cvs/`; `.rag-private/` is git-ignored.
- CV entries require `{ "documentKind": "cv", "redaction": { "profile": "cv", "manualReview": true } }` and may add personally identifying literals to redact.
- CV extraction redacts email addresses, labelled phone/address/birth details, URLs, and manifest-provided literals before hashing, embedding, or persistence. The loader rejects any CV stored beneath `public/`.
- The CVs currently under `public/files/cvs` must be moved to `.rag-private/cvs` before they are added to the manifest. Cite `/about-us/` or another public profile page, never the raw CV file.

### Homepage Section Context

- `rag/config/localSources.ts` is the canonical mapping of homepage DOM IDs to RAG source keys.
- Homepage content is ingested as independent sources such as `home:services`, `home:overview`, and `home:faq`; the old aggregate `homepage/homepage` source was removed by migration.
- `useActiveHomepageSection` observes the visible homepage section and `AssistantWidget` submits it as `pageContext.activeSection`.
- The runtime validates section IDs server-side and supplies the section to question rewriting only for explicit current-section references. It does not retrieve or boost the section for unrelated questions.
- Project pages follow the same rule: page metadata resolves explicit current-project references without otherwise preferring that project.

### Database State

- `20260723000000_add_rag_source_key_filter.sql` remains applied.
- `20260723000001_add_rag_source_policy.sql` was applied to the connected Supabase project.
- The policy migration adds `origin` and `is_public`, migrates `portfolio_pdf` to `local_document`, assigns stable keys to existing external sources, removes the obsolete aggregate homepage source, and recreates `match_rag_chunks` with `source_origins` filtering.
- Local re-ingestion completed after migration: 12 homepage section sources and 17 chunks were added; 62 unchanged sources were skipped; no existing corpus reset was performed.

### Current Verification

- `npm run typecheck:rag` passes.
- `npm run lint` passes.
- `npm run build` passes, including SEO prerender and image optimization.
- Direct `--file` selection loads an individual Markdown blog post and `public/files/portfolio.pdf` correctly.
- CV redaction smoke tests remove email, phone, address, birth-date, and URL content before persistence.
- `npx tsx rag/runtime/scripts/testAsk.ts --retrieve-only --page-path / --page-title Homepage --section services "Tell me more about this section"` resolves the reference through the rewritten query and retrieves relevant `home:services` chunks.
- `npx tsx rag/runtime/scripts/testAsk.ts --retrieve-only "Which external profiles mention ARG Software?"` returns matching first-party and trusted external contexts when both are available.

### Operational Commands

```bash
npm run rag:ingest:local -- --all
npm run rag:ingest:local -- --file src/blog/my-new-post.md
npm run rag:ingest:local -- --file public/files/portfolio.pdf
npm run rag:ingest:external -- --source linkedin
npx tsx rag/runtime/scripts/testAsk.ts --retrieve-only --page-path / --page-title Homepage --section services "Tell me more about this section"
```

### Remaining Work

1. Move any raw CVs from `public/files/cvs` to `.rag-private/cvs`, redact the original files, and add manually reviewed CV entries to `rag/config/localSources.ts`.
2. Test the active-section behavior in the browser on desktop and mobile.
3. ~~Add rate limiting or bot verification to the public ask endpoint before deployment.~~ **Done** — see Security section below.

## Superseded Continuation

### Implemented Since The Historical Handoff

- `vite.config.js` now loads all local environment variables with Vite's `loadEnv()` before its local ask middleware calls `askQuestion()`. This fixed local assistant failures caused by RAG credentials in `.env` not reaching `process.env`.
- `netlify/functions/ask.js` and the Vite middleware return `configuration_error` with HTTP 503 when required RAG environment variables are missing, instead of masking that condition as `answer_failed`.
- `AssistantWidget` is independent of email capture. It accepts generic `isSuppressed` and `onOpenChange` props; it no longer receives `emailVisible`.
- `WidgetManager` remains the narrow coordinator for mutually exclusive widgets. It suppresses email capture while the assistant is open, and suppresses the assistant while email capture is visible.
- `useLeadCaptureVisibility` accepts generic `isSuppressed` state.
- The email capture card has a higher z-index than the assistant panel as a CSS fallback; normal widget state prevents overlap.
- `AssistantWidget` uses the shared `isMobile()` helper and `MOBILE_BREAKPOINT` instead of a hardcoded breakpoint.
- Assistant error copy supports English and Portuguese. Browser locale handling maps `pt-*` to Portuguese and defaults all other locales to English. Keep this scope; do not add an external translation dependency for error states.
- The assistant sends bounded page metadata (`pathname` and document title) with every question. The runtime validates it, derives a project slug only from `/projects/:slug/`, and passes it to the retrieval rewrite prompt as navigation data rather than instructions.
- The runtime rewrites each question once, reuses that embedding for retrieval, and prefers relevant chunks from the active project without excluding general sources.
- Retrieval starts at the existing `0.72` similarity threshold and retries at `RAG_FALLBACK_SIMILARITY_THRESHOLD=0.60` only when fewer than the requested number of contexts are found. Results are deduplicated and capped at `RAG_MATCH_COUNT`.
- Internal ingestion derives `ARG Team`, `José Antunes`, and `Rui Rocha` sources from homepage, About, and careers JSON. They use the existing `about` source type and were ingested without resetting existing data.
- Supabase migration `20260723000000_add_rag_source_key_filter.sql` is applied. `match_rag_chunks` now accepts optional `source_keys` for active-project preference.
- The intent and answer prompts explicitly cover team, founder experience, pricing, budgets, estimates, and project-cost questions. They prohibit invented people, rates, budgets, and estimates.

### Recent Commit

- `3a6ec5d fix(rag): coordinate assistant and lead capture` contains the previously pending widget, configuration, and handoff changes.

### Current Working Tree

The local bot improvements are intentionally uncommitted. Review and commit them together; do not revert them or reset the RAG database.

```text
M .env.example
M docs/rag-session-handoff.md
M netlify/functions/ask.js
M rag/clients/deepseek.ts
M rag/config/env.ts
M rag/ingestion/sources/internal.ts
M rag/runtime/ask.ts
M rag/runtime/scripts/testAsk.ts
M rag/types/aiClient.ts
M rag/types/config.ts
M src/components/widgets/AssistantWidget.jsx
M src/styles/assistant.css
M supabase/scripts.js
M vite.config.js
?? supabase/migrations/20260723000000_add_rag_source_key_filter.sql
```

### Database State

- `20260723000000_add_rag_source_key_filter.sql` has been applied to the connected Supabase project.
- `about/arg-team`, `about/jose-antunes`, and `about/rui-rocha` have been ingested.
- No tables or existing sources were cleared.
- No Netlify deployment has been performed.

### Latest Verification

- `npm run lint` passes.
- `npm run typecheck:rag` passes.
- `npm run build` passes.
- `npm run rag:ask:test -- "What does ARG Software do?"` returns an answer with citations.
- `npm run rag:ingest:internal -- --source arg-team --source jose-antunes --source rui-rocha` ingested all three generated sources.
- `npm run rag:ask:test -- "Who is part of ARG?"` correctly identifies José Antunes and Rui Rocha and describes other collaborators as an unnamed trusted network.
- `npm run rag:ask:test -- --retrieve-only --page-path=/projects/mojaloop/ --page-title=Mojaloop "Tell me more about this project."` prioritizes Mojaloop contexts.
- `npm run rag:ask:test -- --page-path=/projects/mojaloop/ --page-title=Mojaloop "Tell me more about this project."` answers from Mojaloop context.
- `npm run supabase:push` completes with the remote database up to date.
- A forced dual-index refresh completed successfully: 75 local sources (424 chunks) and one approved external source (one chunk), with zero ingestion failures.
- All 441 `rag_chunks` rows have both a Gemini Embedding 2 primary vector and a Gemini Embedding 1 fallback vector.
- `npm run rag:ask:test -- --retrieve-only "What does ARG Software do?"` completed through the primary retrieval path and returned four chunks.

### Current Gaps

The public endpoint still needs abuse protection such as rate limiting or bot verification before deployment.

### Required Next Work

1. Test the assistant in the browser on project pages, including English and Portuguese error states.
2. Before deployment, add public-endpoint abuse protection such as rate limiting or bot verification.

### DesignRush Pricing

`rag/config/externalSources.ts` allows only the private DesignRush snapshot under `.rag-private/`. It extracts the approved minimum budget, hourly rate, and explicitly published project budget ranges; it does not ingest the raw dashboard text, navigation, or directory categories.

- GoodFirms, TechBehemoths, LinkedIn, and the GitHub directory sources were removed from the RAG database.
- The DesignRush source is internal reference data. Assistant answers must never name, link to, cite, or otherwise disclose it.
- A project budget range can be stated only when the snapshot explicitly associates it with that project. The current snapshot associates Sky Tracks with `$20K - $100K`.
- The saved profile and its assets live under `.rag-private/`, which is ignored and not deployed.

To refresh the approved commercial facts after updating the local snapshot:

```bash
npm run rag:ingest:external -- --source designrush --refresh
```

### Re-ingestion Strategy

Do not clear tables. Internal ingestion is content-hash/upsert based and replaces chunks only for the refreshed source.

Generated team and founder sources are already ingested. To refresh them after source-data changes:

```bash
npm run rag:ingest:local -- --file src/data/about.json --refresh
npm run rag:ingest:local -- --file src/data/homepage.json --refresh
npm run rag:ingest:local -- --file src/data/careersPage.json --refresh
```

Refresh the DesignRush source only from the private saved profile. Do not bypass external access controls to fetch it live.

### Dual Embeddings And Quota Fallback

The `rag_chunks` table stores the original chunk text once and keeps one vector column per embedding model:

- `embedding`: Gemini Embedding 2 primary vector.
- `fallback_embedding`: Gemini Embedding 1 fallback vector.

Migrations `20260724000000_add_rag_fallback_embeddings.sql` and
`20260724000001_allow_fallback_only_rag_chunks.sql` add the fallback index and permit
temporarily Model-1-only chunks. Normal ingestion writes both vectors. Runtime retrieval
embeds and searches with Model 2 first; on `GeminiEmbeddingQuotaError`, it re-embeds the
same query with Model 1 and calls `match_rag_chunks_fallback`.

On July 24, 2026, normal forced ingestion refreshed both indexes for 75 local sources
(424 chunks) and one approved external source (one chunk), with no failures. Database
verification confirmed that all 441 `rag_chunks` rows have both `embedding` and
`fallback_embedding` populated.

The Model 1-only repair command is:

```bash
npm run rag:embeddings:rebuild:fallback
```

This command intentionally clears only `fallback_embedding`, then regenerates it from the
stored chunk text. It does not alter source records, chunk text, metadata, or Model 2 vectors.
Use it only to repair the Model 1 fallback index; use normal forced ingestion to refresh both
indexes together.

If a source is missing either vector, force-refresh it with the normal local or external ingestion
command. Normal ingestion writes both Model 2 primary vectors and Model 1 fallback vectors.

To refresh every index without clearing source records or chunk data:

```bash
npm run rag:ingest:local -- --all --refresh
npm run rag:ingest:external -- --all --refresh
```

### Required Tests For The Next Session

```bash
npm run lint
npm run typecheck:rag
npm run build
npm run rag:ask:test -- "Who is part of ARG?"
npm run rag:ask:test -- "What is Jose Antunes's experience?"
npm run rag:ask:test -- "What is Rui Rocha's experience?"
npm run rag:ask:test -- --retrieve-only --page-path=/projects/mojaloop/ --page-title=Mojaloop "Tell me more about this project."
npm run rag:ask:test -- "Do you work with design, branding, UX/UI, or web design?"
npm run rag:ask:test -- "Does ARG work with embedded systems?"
npm run rag:ask:test -- "How much did Sky Tracks cost?"
```

Also test in the browser:

- On a project page: "Tell me more about this project."
- On any page: "Who is part of ARG?"
- Project-cost questions with and without verified pricing context.
- English and Portuguese browser locales for assistant errors.

## Completed RAG Correction Plan

This section recorded the correction plan for the assistant behaviour observed on July 24, 2026. The implementation and verification described below were completed on the same day. Preserve the existing source-authority and no-invention rules in future work.

### Observed Failures

- `Latest articles?` and `Do you have blog posts?` can return an insufficient-answer response even though blog posts are ingested.
- The assistant can claim that it covers blog posts in one reply, then deny having enough blog information in the next reply.
- A fintech question that also contains a technical term such as `AI` can retrieve AI/RAG blog material while excluding ARG's documented payment and financial-infrastructure projects.
- A follow-up such as `does he know Python?`, after discussing Rui Rocha, is routed to technical blog retrieval because the raw question contains `Python`. This excludes Rui's public profile and can show an unrelated article recommendation.
- The assistant's existing insufficient-answer copy is mechanical and exposes internal wording such as "available ARG Software context".
- Commit `5240655 feat(rag): add embedding fallback` introduced a `--fallback-only` CLI flag and type, but `rag/ingestion/ingestPipeline.ts` does not currently use it. The advertised fallback-only ingestion workflow is therefore incomplete.

### Core Retrieval Design

Refactor `rag/runtime/ask.ts` so a single resolved retrieval route controls source selection and article recommendations. The route must be based on the rewritten English retrieval query, not only the raw user message. The rewrite query resolves follow-up references and translates non-English questions; the raw question remains appropriate for contact/action detection.

Use route kinds equivalent to:

- `latest_blog`
- `person_profile`
- `fintech`
- `pricing`
- `capability`
- `technical_insight`
- `general`

The resolved route must be passed to article-recommendation logic. Do not classify the raw question a second time when deciding whether to show recommendations.

### Latest Blog Posts

For requests such as `Latest articles?`, `newest blog posts`, and `what are the most recent ones?`:

1. Detect the request from the rewritten query so conversational follow-ups and translated questions work.
2. Bypass vector similarity search entirely.
3. Read public, first-party `blog_post` records directly from `rag_sources`.
4. Parse and sort `metadata.date` with the same `Date.parse()` behaviour used by the frontend.
5. Ignore sources with an invalid or missing publication date.
6. Fetch the first chunk for the three newest sources and return them as contexts.
7. Return the same three articles as UI recommendations so the assistant can show `Read more` links.

This direct branch must still respect `is_public = true` and `origin = first_party`.

Update `rag/ingestion/sources/local.ts` so every blog chunk begins with searchable, public metadata:

```text
Blog post
Title: ...
Subtitle: ...
Published: ...
Topic: ...
```

Use frontmatter `title`, `subtitle` with `intro` as fallback, `date`, and `tag`, followed by the stripped article body. Continue retaining the full frontmatter as source metadata. This lets ordinary questions such as `Do you have blog posts?` retrieve actual blog records rather than depending on a match against arbitrary article prose.

Update `rag/prompts/answering.ts` to expose only the publication date for `blog_post` contexts. Do not expose source paths or unrelated metadata. Instruct the answer prompt to list recent-post titles and dates only when they are present in the retrieved data.

### Fintech Retrieval

Add a finance-domain pattern in `rag/runtime/ask.ts` covering terms such as:

- `fintech`
- `financial`
- `payments`
- `banking`
- `clearing`
- `settlement`
- `trading`
- `financial inclusion`

Give finance questions priority access to authoritative ARG sources: `project`, `about`, `homepage`, and `working_with_us`. This route must win over generic technical-blog routing, so questions such as `Can you build AI for fintech?` retrieve official financial-infrastructure evidence rather than only AI/RAG articles.

The documented evidence is already in `src/data/projects.json`, notably Mojaloop and People's Clearinghouse. The answer must distinguish documented project experience from a promise that every fintech capability is an in-house service.

### Person Profiles And Pronoun Follow-Ups

Keep a small public-profile mapping in `rag/runtime/ask.ts`:

- `José Antunes` -> `about/jose-antunes`
- `Rui Rocha` -> `about/rui-rocha`

When the rewritten query names a mapped person:

1. Retrieve that exact public source before technical, capability, or blog routes.
2. Bypass semantic similarity thresholds so a profile remains available even when the asked skill is not in the profile.
3. If no person can be resolved from history, ask whom the visitor means instead of returning technical articles.

Expand `buildQuestionRewritePrompt()` to explicitly resolve `he`, `she`, `they`, `him`, `her`, and possessives from conversation history.

Add an answer rule that a company-level technology must never be attributed to an individual without individual-specific public evidence. For example, ARG's use of Python cannot establish that Rui Rocha personally uses Python.

### Article Recommendations

Only return article recommendations for `technical_insight` and `latest_blog` routes. Do not return recommendations for `person_profile`, `fintech`, `pricing`, `capability`, or `general` routes.

This prevents a technical word in a profile question from producing unrelated article cards. A nonempty but irrelevant retrieval must not be treated as an article recommendation opportunity.

### Natural Unknown Answers

Replace the mechanical insufficient-context instructions in `rag/prompts/answering.ts`.

Never use these phrases:

- `I do not have enough information.`
- `I do not have enough context.`
- `Based on the provided context.`
- `available ARG Software context`

When the assistant cannot verify an exact answer, it must say so naturally and invite the visitor to message ARG so someone closer to the subject can answer properly. Keep the reply specific to the question and do not invent facts.

Expected style:

```text
I don't know that exactly. Please send us a message, and someone closer to this can give you a better answer.
```

For partial evidence, acknowledge the boundary first:

```text
I can't confirm whether Rui uses Python personally. Please send us a message, and someone who works more closely with him can answer properly.
```

Apply this rule both when retrieval returns no contexts and when retrieved material does not establish the requested fact. The no-context response should return the existing `email_hello` action so the widget gives the visitor a direct contact option.

For generic assistant-scope questions, do not enumerate categories that have not been retrieved. Use a modest invitation to ask about information published on the ARG website instead.

### Embedding Fallback Repair

Complete the `fallbackOnly` implementation in `rag/ingestion/ingestPipeline.ts`:

1. Destructure and honor `fallbackOnly`.
2. In fallback-only mode, generate only Gemini Embedding 1 vectors.
3. Call `updateFallbackEmbeddings()` rather than primary-vector upsert logic.
4. Do not skip unchanged content when fallback embeddings need backfilling.
5. Do not call the primary embedding provider in fallback-only mode.

Normal ingestion should also handle `GeminiEmbeddingQuotaError` by persisting fallback-only vectors. If a primary vector is missing after an exceptional Model 2 failure, re-run normal ingestion with `--refresh` to restore both vectors.

Before relying on runtime fallback, validate the connected Supabase project:

- Both fallback migrations are applied.
- Every expected public blog source exists and has a valid date.
- `about/rui-rocha` exists.
- Fallback-vector coverage matches the total number of chunks.
- Primary-vector coverage is known, including any Model-1-only chunks.

Do not clear the RAG tables. Use the existing content-hash/upsert workflow and a normal forced refresh to rebuild both indexes. Reserve the fallback rebuild command for a Model-1-only repair.

### Blog Synchronization Workflow

The existing Medium importer only writes Markdown files under `src/blog/`. Gaspar reads blog data from Supabase, so imported or manually added posts must be indexed afterward.

Add an admin-only package command named:

```bash
npm run sync:blog
```

It must:

1. Run the existing Medium import.
2. Run `npm run rag:ingest:local -- --all`.
3. Require local/server credentials and remain outside public Netlify functions.

Content hashing means unchanged sources are skipped. This workflow prevents newly published articles from appearing on the website while remaining unavailable to Gaspar.

### Required Verification

Add focused automated coverage for route selection, direct source retrieval, and fallback-only ingestion. At minimum cover:

- `Latest articles?` returns the newest three dated posts without an embedding call.
- `what are the most recent ones?` resolves a prior article/blog reference.
- `Do you have blog posts?` retrieves searchable blog metadata.
- `What experience do you have in fintech?` retrieves official project evidence.
- `Can you build AI for fintech?` is not routed to blogs alone.
- A Rui Rocha follow-up asking about Python retrieves `about/rui-rocha`.
- The Rui/Python question does not show article recommendations.
- An unresolved pronoun asks for clarification.
- `--fallback-only` never calls the primary embedding provider.
- Primary quota failure uses the fallback index.

The following checks were run after implementation:

```bash
npm run typecheck:rag
npm run lint
npm run build
npm run rag:ask:test -- "Latest articles?"
npm run rag:ask:test -- "Do you have blog posts?"
npm run rag:ask:test -- "What experience do you have in fintech?"
npm run rag:ask:test -- "Can you build AI for fintech?"
npm run rag:ask:test -- --history-json '[{"role":"user","content":"Tell me about Rui Rocha."},{"role":"assistant","content":"Rui is an ARG co-founder."}]' "Does he know Python?"
```

### Completion Record

Implemented changes:

- `rag/runtime/ask.ts` now resolves one retrieval route from the rewritten English question. The route controls source selection, direct retrieval, and article recommendations.
- `latest_blog` reads public first-party blog sources directly, ignores invalid dates, returns the newest three posts, and does not generate an embedding.
- General blog questions search only `blog_post` sources, whose chunks now start with a public title, subtitle, publication date, and topic header.
- The `fintech` route takes precedence over technical-blog retrieval and searches `project`, `about`, `homepage`, and `working_with_us` evidence.
- Named José Antunes and Rui Rocha questions retrieve their exact public profile. Unresolved personal pronouns ask for a name. Person/technology questions include matching company technology evidence without attributing it to the individual.
- Article recommendations are limited to `latest_blog` and `technical_insight` routes.
- Natural insufficient-information and scope prompts no longer promise unverified coverage or expose internal context wording. Empty retrieval returns `email_hello`.
- `--fallback-only` now bypasses unchanged-content skipping, uses Gemini Embedding 1 only, and persists through `updateFallbackEmbeddings()`. Normal ingestion catches Model 2 quota failures and persists fallback vectors.
- `sync:blog` imports Medium posts and runs local RAG ingestion. `rag/README.md` documents the same ingestion requirement for manual Markdown changes.
- `rag:test` runs focused Node tests for routing, direct retrieval, primary quota fallback, and fallback-only ingestion.

Supabase verification after the source refresh:

- `supabase db push` reported the remote schema is up to date.
- 37 public first-party blog sources exist; 35 have valid publication dates. Two undated posts are intentionally excluded from recent-post retrieval.
- The newest stored source is `the-stack-nobody-hypes-but-serious-ctos-keep-choosing` dated July 15, 2026, and its first chunk has the searchable blog header.
- `about/rui-rocha` is present as `source_type = about`, `source_key = rui-rocha`.
- All 449 chunks have both primary `embedding` and `fallback_embedding` vectors.

Validation completed:

```bash
npm run typecheck:rag
npm run lint
npm run rag:test
npm run build
```

Live checks confirmed latest-article retrieval and recommendations, blog metadata retrieval, fintech and AI-for-fintech routing, Rui/Python evidence boundaries, and a deliberately primary-quota-failing query using the live fallback index.

## RAG Refactor Completion - July 26, 2026

`docs/rag-refactor-plan.md` phases 1 through 8 are complete and committed:

- `5fe9626 chore(rag): move tests and scripts to dedicated folders`
- `d84508f refactor(rag): split types by domain under rag/core/types`
- `8419638 refactor(rag): add runtime read repository boundary`
- `290d96c refactor(rag): split prompt modules by purpose`
- `d91dcfb refactor(rag): shrink ask orchestration`
- `8e2faf3 refactor(rag): split retrieval into strategies`
- `5845d45 test(rag): add shared fakes and fixtures`
- `b11557c fix(rag): retrieve exact technologies from indexed evidence`

Current RAG structure highlights:

- Focused domain types live under `rag/core/types/`.
- Runtime orchestration entrypoint is `rag/runtime/askQuestion.ts`.
- Public ask endpoints in `netlify/functions/ask.js` and `vite.config.js` import `askQuestion.ts`.
- Runtime read access goes through `rag/repositories/RagReadRepository.ts`.
- Supabase table names and RPC names are isolated in `rag/repositories/supabase/SupabaseRagReadRepository.ts` and `SupabaseRagWriteRepository.ts`.
- Tests live under `rag/tests/`; scripts live under `rag/scripts/`.
- Shared fakes and fixtures live under `rag/tests/fakes/` and `rag/tests/fixtures/`.
- Retrieval strategies live under `rag/runtime/retrieval/strategies/`.
- Technology normalization, compound question splitting, and exact evidence lookup live under `rag/runtime/retrieval/technology/`.

Important behavior from the refactor:

- Exact technology retrieval now searches indexed chunk text lexically before vector fallback.
- Multi-technology retrieval cap was raised from 3 to 6 so compound questions can cover all requested technologies.
- Supported aliases include `kubernettes`, `k8s`, `kubernetes`, `docker`, `.net`, `dotnet`, `asp.net`, `angular`, and `react`.
- Official/project source evidence is preferred over blog evidence for company technology capability answers.
- Repository code uses `EmbeddingIndex = 'primary' | 'fallback'` instead of leaking Supabase RPC names into domain-level retrieval code.
- The deprecated `supabase` input was removed from `askQuestion`; tests now use repository fakes.

Phase 9 re-indexing was intentionally skipped. The completed changes affect runtime retrieval and code structure only; no loaded source content, chunking, source generation, or stored metadata changed.

Final automated verification completed successfully:

```bash
npm run typecheck:rag
npm run rag:test
npm run lint
npm run build
```

Live technology checks completed successfully with the current indexed Supabase data:

- `Do you use Kubernetes?` confirms Kubernetes and cites `https://arg.software/working-with-us/`.
- `Do you use Docker?` confirms Docker and cites `https://arg.software/working-with-us/`.
- `Do you use .NET?` confirms .NET and cites `https://arg.software/projects/tv-cine/`.
- `Do you use Angular?` confirms Angular and cites `https://arg.software/working-with-us/`.
- `Do you use React?` confirms React and cites `https://arg.software/working-with-us/`.
- `And .net? or angular? or react? also do you use kubernettes or docker?` confirms all five requested technologies.

When a future ingestion leaves Model-1-only chunks after a Model 2 quota event, wait for quota recovery and run:

```bash
npm run rag:ingest:local -- --all --refresh
```

Also verify the same questions in the browser, including the latest-article quick prompt, article cards, the contact action on unknown answers, and English and Portuguese responses.

## RAG Config Consolidation - July 26, 2026

Current config modules:

- `rag/config/env.ts`: environment defaults, required env validation, and local `.env` loading for admin scripts.
- `rag/config/localSources.ts`: local source registry, homepage section mapping, and local document entries.
- `rag/config/externalSources.ts`: approved trusted external source allowlist.
- `rag/config/assistantPolicy.ts`: assistant response policy content and source metadata.

Removed superseded config files:

- `rag/config/loadLocalEnv.ts`
- `rag/config/homepageSections.ts`
- `rag/config/local-sources.json`
- `rag/config/local-documents.json`
- `rag/config/external-sources.json`
- `rag/config/assistant-policy.json`

The frontend no longer imports RAG config. `useActiveHomepageSection` keeps only the client-safe homepage section ID list, while runtime validation and ingestion use `localSources.ts`.

## Ranked Project References - July 26, 2026

Project reference questions such as `What are the top referenced projects of Arg?` now use direct project-reference retrieval instead of semantic vector search or technology fallback handling.

- Top project rankings are source data in `src/data/projects.json` via `referenceRank`.
- Current top three are Mojaloop, People's Clearinghouse, and Sky Tracks.
- Ingestion stores the rank as `rag_sources.metadata.reference_rank` for project sources.
- Runtime retrieval returns `home:projects` plus the top ranked project sources, capped by requested `top N` wording and defaulting to three.
- The unconfirmed technology fallback now requires technology-support wording, so project-list questions cannot become fake stack answers.

Targeted re-ingestion completed after adding project ranks:

```bash
npm run rag:ingest:local -- --source home:projects --source mojaloop --source peoples-clearinghouse --source sky-tracks
```

Live check confirmed the exact question retrieves `home:projects`, `mojaloop`, `peoples-clearinghouse`, and `sky-tracks`, and answers with Mojaloop, People's Clearinghouse, and Sky Tracks.

## Ask Endpoint Security - July 26, 2026

Three-layer defense for the public `POST /.netlify/functions/ask` endpoint.

### Layer 1: Netlify Native Rate Limit

Both functions export `config` with Netlify's code-based rate limiting (all plans, enforced at the edge before function invocation):

- `ask.js`: 6 requests per IP per 60 seconds.
- `askChallenge.js`: 30 requests per IP per 60 seconds.

When exceeded, Netlify returns HTTP 429 before the function runs — zero invocation cost.

### Layer 2: ALTCHA Proof-of-Work Bot Verification

Uses ALTCHA v2 (`altcha-lib`) with PBKDF2/SHA-256 — fully local cryptographic verification, no third-party calls, GDPR-compliant.

- `GET /.netlify/functions/ask-challenge` returns a signed challenge with 5-minute TTL.
- Client solves the challenge programmatically (`solveChallenge` from `altcha-lib`) — invisible to the user, ~0.5–1s on modern devices.
- Server verifies the solution before any AI calls. Failed verification returns 403 `bot_verification_failed`.
- Challenge difficulty is env-configurable via `ALTCHA_COST`, `ALTCHA_COUNTER_MIN`, `ALTCHA_COUNTER_MAX`.

### Layer 3: App-Level Rate Limits (Supabase)

Per-day per-IP and global daily budget caps, enforced in the function after ALTCHA verification:

- 6 requests/minute per IP (matching Netlify native limit).
- 30 requests/day per IP.
- 500 requests/day globally.

Backed by `rag_rate_limits` table + `hit_rag_rate_limit` RPC (atomic fixed-window upsert, service-role only, probabilistic stale-row cleanup). IP hashes are SHA-256 with a configurable salt — no raw IPs stored.

Rate limit errors fail open (log + allow) so a Supabase outage does not break the assistant; Netlify's edge limit still guards.

### Architecture

- `rag/security/altcha.ts`: challenge creation/verification, in-memory challenge store with TTL.
- `rag/security/rateLimit.ts`: pure decision logic, bucket naming, config from env.
- `rag/security/rateLimitStores.ts`: `InMemoryRateLimitStore` (dev middleware) and `SupabaseRateLimitStore` (production function).
- `src/services/altchaservice.js`: frontend challenge fetch + solve.
- `netlify/functions/ask.js`: orchestrates verification → rate limit → askQuestion.
- `netlify/functions/askChallenge.js`: challenge endpoint.
- `vite.config.js` dev middleware mirrors both endpoints with in-memory stores.

### New Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ALTCHA_HMAC_KEY` | Yes | — | HMAC secret for challenge signing |
| `ALTCHA_COST` | No | 2000 | PBKDF2 iteration count |
| `ALTCHA_COUNTER_MIN` | No | 1000 | Minimum counter for challenge difficulty |
| `ALTCHA_COUNTER_MAX` | No | 3000 | Maximum counter for challenge difficulty |
| `RAG_ASK_RATE_LIMIT_PER_MINUTE` | No | 6 | Per-IP requests per minute |
| `RAG_ASK_RATE_LIMIT_PER_DAY` | No | 30 | Per-IP requests per day |
| `RAG_ASK_GLOBAL_RATE_LIMIT_PER_DAY` | No | 500 | Global daily budget cap |
| `RAG_ASK_RATE_LIMIT_SALT` | No | `arg-ask-rate-limit` | Salt for IP hashing |

### Frontend Changes

- `AssistantWidget` fetches + solves an ALTCHA challenge before every submission.
- New error copy for `bot_verification_failed` and `rate_limited` in English and Portuguese.
- 429 responses from Netlify native limits (non-JSON body) are handled gracefully.

### Supabase Migration

`supabase/migrations/20260726000000_create_rag_rate_limits.sql` creates the rate limiting table and RPC function. Apply with `npm run supabase:push`.

### Verification

```bash
npm run typecheck:rag    # passes
npm run rag:test         # 73 tests, 73 passing (includes ALTCHA roundtrip, tampered solution, rate limit windows)
npm run lint:rag         # passes
npm run build            # passes (including SEO prerender, image optimization)
```
