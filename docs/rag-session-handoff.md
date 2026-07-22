# RAG Session Handoff

## Current Goal

Build a RAG assistant for the ARG Software website.

Target architecture:

- Gemini for embeddings.
- Supabase + pgvector for storage/retrieval.
- DeepSeek for final answer generation.
- Netlify Functions for API endpoints.
- Separate ingestion flows for internal and external sources.

## Decisions Made

- Use one embedding provider/model only to avoid mixed vector spaces.
- Use Gemini embeddings and DeepSeek generation.
- Use Supabase for database/vector search only.
- Use Netlify Functions instead of Supabase Edge Functions.
- Manage Supabase schema through repo migrations.
- Do not expose API keys in frontend code.
- Ingest internal and external sources separately.
- Prefer canonical JSON/Markdown/PDF sources over scraping JSX/components.
- Start external scraping from a manual allowlist, not an open crawler.

## Environment Variables

Expected local/server env vars:

```env
SUPABASE_URL=
SUPABASE_PROJECT_REF=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=text-embedding-004

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

RAG_INGEST_SECRET=
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
- `.env.example` appeared as untracked during the previous session and was not modified intentionally.
- `public/files/portfolio.pdf` exists and should be included in internal ingestion.
- The first RAG implementation should ingest internal data without scraping rendered React.

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
- `public/files/portfolio.pdf`

Do not ingest:

- `src/constants/projectGallery.js`
- UI animation/config-only data.
- 404 page copy.

## Planned Endpoints

Use Netlify Functions:

- `POST /.netlify/functions/ingest-internal`
- `POST /.netlify/functions/ingest-external`
- `POST /.netlify/functions/ask`

Ingestion endpoints should require:

```http
Authorization: Bearer ${RAG_INGEST_SECRET}
```

## Planned Database Schema

Create Supabase migration under `supabase/migrations/`.

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

## Planned External Sources

Add a curated allowlist file, for example:

- `rag/external-sources.json`

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

## Next Implementation Steps

1. Add dependencies:
   - `@supabase/supabase-js`
   - `dotenv`
   - PDF text extraction package, likely `pdf-parse` or equivalent.
   - HTML extraction package, likely `cheerio`.

2. Add Supabase files:
   - `supabase/config.toml`
   - first SQL migration for RAG schema.

3. Add shared RAG modules:
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

4. Add ingestion functions:
   - internal ingestion for JSON/Markdown/PDF.
   - external ingestion for allowlisted URLs.

5. Add ask function:
   - embed user question with Gemini.
   - call Supabase RPC.
   - send retrieved context to DeepSeek.
   - return answer plus citations.

6. Add npm scripts for local/admin workflows:
   - `rag:ingest:internal`
   - `rag:ingest:external`
   - `rag:ask:test`
   - `supabase:link`
   - `supabase:push`

## Suggested First SQL Shape

Use `vector(768)` if continuing with Google `text-embedding-004`.

Tables should support:

- source URL/path uniqueness.
- source type filtering.
- metadata JSON.
- chunk ordering.
- citations in answers.

## Continue From Here

Start by checking the current worktree, then implement the Supabase migration and shared RAG modules.

Useful commands:

```bash
git status --short
npm run lint
npm run build
```
