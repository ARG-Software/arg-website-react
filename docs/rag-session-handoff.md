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
SUPABASE_URL=
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
GEMINI_FALLBACK_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_FALLBACK_EMBEDDING_DIMENSIONS=768
GEMINI_EMBEDDING_REQUEST_DELAY_MS=750

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
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
- The current `.env` has a valid `DEEPSEEK_API_KEY`; full answer generation has been verified locally.

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
- Documents listed in `rag/config/local-documents.json`.

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
- External allowlist lives at `rag/config/external-sources.json` and currently includes five approved sources.

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

Use the curated allowlist file:

- `rag/config/external-sources.json`

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

- `rag/config/local-documents.json`

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
   - Gemini embeddings use `gemini-embedding-2` with `GEMINI_EMBEDDING_DIMENSIONS=768`.
   - Gemini embedding requests are throttled with `GEMINI_EMBEDDING_REQUEST_DELAY_MS=750` to stay under free-tier RPM limits.
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
   - Full generation smoke test passes with the current `DEEPSEEK_API_KEY`.
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
   - `rag/config/external-sources.json`
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

Use `vector(768)` with Google `gemini-embedding-2` and `GEMINI_EMBEDDING_DIMENSIONS=768`.

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
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `DEEPSEEK_API_KEY`
- **External sources**: Optionally add more manually approved external URLs to `rag/config/external-sources.json` and rerun external ingestion.
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

- Local document manifest: `rag/config/local-documents.json`.
- Local source registry: `rag/config/local-sources.json` with `kind: local_document_manifest`.
- Supported document format is currently PDF. Documents use the `local_document` source type.
- Portfolio documents may cite their public file URL.
- CVs must be kept outside `public/`, for example under `.rag-private/cvs/`; `.rag-private/` is git-ignored.
- CV entries require `{ "documentKind": "cv", "redaction": { "profile": "cv", "manualReview": true } }` and may add personally identifying literals to redact.
- CV extraction redacts email addresses, labelled phone/address/birth details, URLs, and manifest-provided literals before hashing, embedding, or persistence. The loader rejects any CV stored beneath `public/`.
- The CVs currently under `public/files/cvs` must be moved to `.rag-private/cvs` before they are added to the manifest. Cite `/about-us/` or another public profile page, never the raw CV file.

### Homepage Section Context

- `rag/config/homepageSections.ts` is the canonical mapping of homepage DOM IDs to RAG source keys.
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

1. Move any raw CVs from `public/files/cvs` to `.rag-private/cvs`, redact the original files, and add manually reviewed CV entries to `local-documents.json`.
2. Test the active-section behavior in the browser on desktop and mobile.
3. Add rate limiting or bot verification to the public ask endpoint before deployment.

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

### Current Gaps

The public endpoint still needs abuse protection such as rate limiting or bot verification before deployment.

### Required Next Work

1. Test the assistant in the browser on project pages, including English and Portuguese error states.
2. Before deployment, add public-endpoint abuse protection such as rate limiting or bot verification.

### DesignRush Pricing

`rag/config/external-sources.json` allows only the private DesignRush snapshot at `.rag-private/designrush-profile.html`. It extracts the approved minimum budget, hourly rate, and explicitly published project budget ranges; it does not ingest the raw dashboard text, navigation, or directory categories.

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

The Model 1 index was rebuilt from all 441 current `rag_chunks.content` rows with:

```bash
npm run rag:embeddings:rebuild:fallback
```

This command intentionally clears only `fallback_embedding`, then regenerates it from the
stored chunk text. It does not alter source records, chunk text, metadata, or Model 2 vectors.
Use it only when the Gemini Embedding 1 quota can cover the full corpus.

If a source was added during a Model-1-only period, re-ingest it after the Model 2 quota resets
to populate its primary vector as well. The normal local and external ingestion commands then
continue to write both models.

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
