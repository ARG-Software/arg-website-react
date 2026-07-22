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
- Follow-up question rewriting before retrieval when history is provided.
- Safe public error responses for server errors.

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
   - Files are grouped under `rag/config/`, `rag/clients/`, `rag/ingestion/processing/`, and `rag/ingestion/sources/`.
   - env validation.
   - Supabase server client.
   - Gemini embedding client.
   - DeepSeek answer client.
   - chunking helpers.
   - source/chunk upsert helpers.
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
   - Shared runtime lives at `rag/runtime/ask.js`.
   - Local test script lives at `rag/runtime/scripts/testAsk.js`.
   - Netlify endpoint lives at `netlify/functions/ask.js`.
   - Retrieval-only smoke test passes.
   - Full generation smoke test passes with the current `DEEPSEEK_API_KEY`.
   - Optional conversation history is supported through `messages`.
   - Follow-up questions are rewritten into standalone retrieval queries before embedding.

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

## Suggested First SQL Shape

Use `vector(768)` with Google `gemini-embedding-2` and `GEMINI_EMBEDDING_DIMENSIONS=768`.

Tables should support:

- source URL/path uniqueness.
- source type filtering.
- metadata JSON.
- chunk ordering.
- citations in answers.

## Continue From Here

Frontend UI and deployment environment setup were intentionally left for the end.

Recommended next work:

- Add a frontend assistant UI that calls `POST /.netlify/functions/ask`.
- Have the frontend send recent `user`/`assistant` turns through the optional `messages` array for follow-up questions.
- Configure server-side Netlify environment variables before deploying the ask endpoint.
- Optionally add more manually approved external URLs to `rag/config/external-sources.json` and rerun external ingestion.

Verification already completed in this session:

- `npm run lint` passes.
- `npm run build` passes with a longer timeout because image optimization produces large output.
- `npm run rag:ask:test --retrieve-only -- "What does ARG Software do?"` returns 6 chunks from Supabase.
- `npm run rag:ingest:external -- --dry-run` validates all five approved external sources: 90 chunks planned, 0 failures.
- `npm run rag:ingest:external` ingests all five approved external sources: 90 chunks ingested, 0 failures.
- `npm run rag:ask:test -- --retrieve-only "What external profiles mention ARG Software?"` returns external profile chunks from Supabase.
- `npm run rag:ask:test -- "What external profiles mention ARG Software?"` returns a generated answer with citations from DesignRush, GoodFirms, TechBehemoths, and LinkedIn.
- `npm run rag:ask:test -- --external-profile-history "Tell me more about the second one"` verifies conversational follow-up rewriting and answering.

Useful commands:

```bash
git status --short
npm run lint
npm run build
npm run rag:ingest:external -- --dry-run
npm run rag:ask:test --retrieve-only -- "What does ARG Software do?"
npm run rag:ask:test -- "What does ARG Software do?"
npm run rag:ask:test -- "What external profiles mention ARG Software?"
npm run rag:ask:test -- --external-profile-history "Tell me more about the second one"
```
