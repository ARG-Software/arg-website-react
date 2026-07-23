# RAG Session Handoff

## Current Goal

Build a RAG assistant for the ARG Software website.

Target architecture:

- Gemini for embeddings.
- Supabase + pgvector for storage/retrieval.
- DeepSeek for final answer generation.
- Netlify Functions for the public `ask` API endpoint only.
- Local/admin ingestion scripts for internal and external sources.

## Decisions Made

- Use one embedding provider/model only to avoid mixed vector spaces.
- Use Gemini embeddings and DeepSeek generation.
- Use Supabase for database/vector search only.
- Use Netlify Functions instead of Supabase Edge Functions for runtime API calls.
- Manage Supabase schema through repo migrations.
- Do not expose API keys in frontend code.
- Ingest internal and external sources separately.
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
- `public/files/portfolio.pdf` exists and should be included in internal ingestion.
- The first RAG implementation should ingest internal data without scraping rendered React.
- Ingestion should run via local/admin scripts, not deployed Netlify Functions.
- `@supabase/supabase-js` should remain in production `dependencies` for the deployed `ask` function.
- `dotenv`, `cheerio`, and `pdf-parse` should remain in `devDependencies` because they support local/admin ingestion scripts.
- RAG config JSON files live under `rag/config/`.
- Supabase CLI helper lives under `supabase/scripts.js`, not under `rag/`.
- The current `.env` has a valid `DEEPSEEK_API_KEY`; full answer generation has been verified locally.

## Internal Ingestion Sources

Use these for the internal ingestion endpoint/script:

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
- PDFs listed in `rag/config/internal-pdfs.json`.

Default internal PDFs:

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
- Unsupported requests are politely redirected to ARG Software website topics.
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

- internal ingestion for JSON/Markdown/PDF.
- external ingestion for allowlisted URLs.

These scripts should use local/server env vars and must not expose service-role or AI provider keys to frontend code.

Implemented scripts:

- `npm run rag:ingest:internal`
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
- `portfolio_pdf`
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

## Internal PDF Sources

Add repeatable internal PDF ingestion sources to:

- `rag/config/internal-pdfs.json`

Required fields:

```json
{
  "filePath": "public/files/example.pdf",
  "sourceKey": "example-pdf",
  "title": "Example PDF",
  "url": "/files/example.pdf"
}
```

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
npm run rag:ingest:internal          # re-ingest internal sources
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

### Implemented Since The Historical Handoff

- `vite.config.js` now loads all local environment variables with Vite's `loadEnv()` before its local ask middleware calls `askQuestion()`. This fixed local assistant failures caused by RAG credentials in `.env` not reaching `process.env`.
- `netlify/functions/ask.js` and the Vite middleware return `configuration_error` when required RAG environment variables are missing, instead of masking that condition as `answer_failed`.
- `AssistantWidget` is independent of email capture. It accepts generic `isSuppressed` and `onOpenChange` props; it no longer receives `emailVisible`.
- `WidgetManager` remains the narrow coordinator for mutually exclusive widgets. It suppresses email capture while the assistant is open, and suppresses the assistant while email capture is visible.
- `useLeadCaptureVisibility` accepts generic `isSuppressed` state.
- The email capture card has a higher z-index than the assistant panel as a CSS fallback; normal widget state prevents overlap.
- `AssistantWidget` uses the shared `isMobile()` helper and `MOBILE_BREAKPOINT` instead of a hardcoded breakpoint.
- Assistant error copy supports English and Portuguese. Browser locale handling maps `pt-*` to Portuguese and defaults all other locales to English. Keep this scope; do not add an external translation dependency for error states.

### Current Working Tree

These files are modified and intentionally uncommitted:

```text
M docs/rag-session-handoff.md
M netlify/functions/ask.js
M src/components/forms/EmailCaptureForm.jsx
M src/components/widgets/AssistantWidget.jsx
M src/components/widgets/WidgetManager.jsx
M src/hooks/useLeadCaptureVisibility.js
M src/styles/assistant.css
M src/styles/components.css
M vite.config.js
```

Do not revert these changes. Inspect them carefully before adding RAG work.

### Latest Verification

- `npm run lint` passes.
- `npm run typecheck:rag` passes.
- `npm run build` passes.
- `npm run rag:ask:test -- "What does ARG Software do?"` returns an answer with citations.

### Current Gaps

The assistant still lacks page context. The frontend sends only `question` and conversation `messages`, so references such as "this project" or "the project I am seeing" cannot resolve to the current page.

The public team information is spread across existing RAG sources:

- `src/data/homepage.json` contains homepage team cards.
- `src/data/about.json` contains founder profiles and detailed work history.
- Careers data contains additional founder references.

José Antunes and Rui Rocha are the only individually named public team members. The site describes other collaborators as an unnamed trusted network. The assistant must state this accurately and never invent people.

Projects are already ingested individually from `src/data/projects.json`, but broad/ambiguous questions can miss them because retrieval currently uses a single global similarity threshold of `0.72`.

### Required Next Work

1. Generate dedicated first-party RAG sources from existing public JSON data.
   - Create an aggregate `ARG Team` source.
   - Create separate José Antunes and Rui Rocha profile sources.
   - Derive these from existing homepage, About, and careers data rather than creating manually duplicated profile content.
   - Use the existing `about` source type with distinct source keys to avoid a schema migration solely for a new type.

2. Add page context to assistant requests.
   - In `AssistantWidget`, use React Router location and send bounded `pageContext` with `pathname` and `document.title`.
   - Validate and normalize it in `netlify/functions/ask.js` and `rag/runtime/ask.ts`.
   - Derive a project slug server-side for `/projects/:slug/` paths.

3. Resolve contextual project questions.
   - Pass page context to the question-rewrite prompt in `rag/clients/deepseek.ts`.
   - Rewrite references such as "tell me more about this project" to the project identified by page context.
   - Prefer matching chunks from the active project without preventing general questions on a project page from using other sources.

4. Broaden retrieval safely.
   - Do not globally discard the current `0.72` threshold.
   - First run the current high-confidence retrieval.
   - When it returns too little context, retry with a configurable lower threshold, initially around `0.60`.
   - Merge and deduplicate results while continuing to answer only from retrieved context.
   - Add the fallback threshold to `rag/config/env.ts`, `rag/types/config.ts`, and `.env.example`.

5. Update intent and answer prompts.
   - Treat team, founder experience, rates, budgets, estimates, and project-cost questions as `rag_question` requests.
   - For team questions, enumerate named people in retrieved public context and clarify that unnamed collaborators are not publicly listed.
   - For pricing, distinguish a third-party indicative listing from a project quote; never invent rates or estimates.

### DesignRush Pricing

`rag/config/external-sources.json` allowlists the ARG DesignRush profile. External ingestion fetches and indexes the page title, meta description, and visible HTML body; it does not merely store the link.

However:

- The extractor removes script tags, so client-rendered pricing data may not be indexed.
- A current direct fetch of the DesignRush profile returned `403`.
- Existing indexed DesignRush content may still contain data from a previous successful ingestion, but this has not been verified.

Do not drop or reset the RAG database. A reset could remove existing external content that cannot currently be restored because DesignRush may reject a new fetch.

Before making pricing claims, test the existing index:

```bash
npm run rag:ask:test -- --retrieve-only "What hourly rate or minimum project budget does DesignRush list for ARG Software?"
npm run rag:ask:test -- "What hourly rate or minimum project budget does DesignRush list for ARG Software?"
```

If no verified pricing context is returned, do not fabricate it or bypass DesignRush access controls. Use an approved accessible source, or add user-verified pricing to a first-party source and identify third-party marketplace rates as indicative only.

### Re-ingestion Strategy

Do not clear tables. Internal ingestion is content-hash/upsert based and replaces chunks only for the refreshed source.

After generated team/person sources are implemented, refresh the relevant internal data:

```bash
npm run rag:ingest:internal -- --file src/data/about.json --refresh
npm run rag:ingest:internal -- --file src/data/homepage.json --refresh
npm run rag:ingest:internal -- --file src/data/projects.json --refresh
```

Use the generated-source loader's matching selection once it exists. Do not force-refresh DesignRush until it is available through an approved, accessible route.

### Required Tests For The Next Session

```bash
npm run lint
npm run typecheck:rag
npm run build
npm run rag:ask:test -- "Who is part of ARG?"
npm run rag:ask:test -- "What is Jose Antunes's experience?"
npm run rag:ask:test -- "What is Rui Rocha's experience?"
```

Also test in the browser:

- On a project page: "Tell me more about this project."
- On any page: "Who is part of ARG?"
- Project-cost questions with and without verified pricing context.
- English and Portuguese browser locales for assistant errors.
