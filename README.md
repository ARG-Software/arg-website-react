# ARG Software

Corporate website for **ARG Software**, a Portugal-based software studio specializing in fintech, media, and high-growth tech. Architecture-first, production-ready digital platforms.

Live at **[arg.software](https://arg.software)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + React Router 7 (SPA) |
| **Build** | Vite 7 |
| **Styling** | Vanilla CSS (no Tailwind/CSS-in-JS) |
| **Animations** | GSAP 3 + Lenis smooth scroll |
| **3D** | Three.js (404 page, sphere backgrounds) |
| **SEO** | Custom Vite prerender plugin + react-helmet-async |
| **Analytics** | GA4, centralized modular tracking |
| **Assistant/RAG** | Netlify Functions + Supabase pgvector + provider adapters |
| **Lint/Format** | ESLint 9 + Prettier |

---

## Getting Started

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
```

---

## Project Structure

```
├── index.html                    # HTML shell with OG/JSON-LD/GA4
├── vite.config.js                # Vite + plugins config, path aliases
├── plugins/
│   └── seo-prerender/            # Custom SEO prerender + sitemap/RSS/Atom
├── netlify/
│   └── functions/                # Netlify adapters for backend APIs
├── supabase/
│   └── migrations/               # RAG schema, vector search, and rate-limit tables
├── scripts/                      # Import and maintenance scripts
├── public/                       # Static assets (fonts, images, redirects, LLM metadata)
└── src/
    ├── backend/
    │   ├── admin/                # Admin API, domain, application, and infrastructure
    │   ├── public/               # Public discovery/MCP API
    │   ├── rag/                  # Gaspar assistant apps, domain, ingestion, tests
    │   └── shared/               # Shared backend HTTP utilities
    ├── frontend/
    │   ├── main.jsx              # App entry, provider tree, route definitions
    │   ├── animations/           # GSAP animation presets
    │   ├── blog/                 # Markdown blog posts with YAML frontmatter
    │   ├── components/           # App-specific React components
    │   ├── constants/            # Shared frontend constants
    │   ├── data/                 # Frontend JSON/JS data files
    │   ├── hooks/                # Custom React hooks
    │   ├── pages/                # Route components
    │   ├── providers/            # Context providers
    │   ├── services/             # Frontend services
    │   ├── styles/               # Frontend CSS files
    │   ├── utils/                # Analytics, blog parser, structured data, lazy retry
    │   └── workers/              # Frontend web workers
    └── packages/
        └── ui/                   # Shared UI package and Storybook stories
```

---

## Key Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Lint fix → bundle → prerender → image optimize |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint check (no auto-fix) |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |
| `npm run blog:import:medium` | Import published Medium articles into `src/frontend/blog/` |
| `npm run blog:import:medium:drafts` | Import Medium drafts |
| `npm run sync:blog` | Import Medium posts and re-index first-party RAG sources |
| `npm run rag:ingest:local` | Index local website/blog/project/private sources into Supabase |
| `npm run rag:ingest:external` | Index configured trusted external sources |
| `npm run rag:embeddings:rebuild:fallback` | Rebuild fallback embedding vectors |
| `npm run rag:ask:test` | Ask Gaspar from the CLI using the same app wiring |
| `npm run rag:test` | Run the RAG test and eval suite |
| `npm run test:backend` | Run backend JS API and Netlify adapter wiring tests |
| `npm run test:netlify` | Compatibility alias for `npm run test:backend` |
| `npm run typecheck:rag` | Type-check the TypeScript RAG code |
| `npm run supabase:link` | Link the local Supabase CLI project |
| `npm run supabase:push` | Push Supabase migrations |

---

## Path Aliases

Vite config defines these import aliases (see `vite.config.js`):

| Alias | Resolves to |
|---|---|
| `@components` | `src/frontend/components` |
| `@hooks` | `src/frontend/hooks` |
| `@constants` | `src/frontend/constants` |
| `@providers` | `src/frontend/providers` |
| `@utils` | `src/frontend/utils` |
| `@services` | `src/frontend/services` |
| `@data` | `src/frontend/data` |
| `@styles` | `src/frontend/styles` |
| `@ui` | `src/packages/ui/src` |

---

## SEO & Prerendering

The site generates **51 static HTML files** at build time via a custom Vite plugin (`plugins/seo-prerender/`):
- 1 homepage
- 8 static pages (Partners, Blog, Careers, Working with Us, About Us, Contact, Privacy, Terms)
- 34 blog post pages
- 7 project detail pages
- 1 404 page

Each prerendered page includes correct `<title>`, `og:*`, and `twitter:*` tags for social media crawlers.

Also auto-generated at build time:
- **sitemap.xml**: all URLs with priority and changefreq
- **rss.xml**: RSS 2.0 feed of all 34 blog posts
- **atom.xml**: Atom 1.0 feed of all 34 blog posts

---

## Analytics

All GA4 tracking is centralized in `src/frontend/utils/analytics.js`. Tracked events include:
- **Page views** (SPA route changes)
- **CTA clicks** (booking, typeform, portfolio)
- **Outbound link clicks** (external sites)
- **Social link clicks** (GitHub, LinkedIn, Medium)
- **Blog interactions** (search, pagination, TOC, shares, related articles)
- **Partners interactions** (filtering, drawer open, outbound)
- **Careers interactions** (job accordion, apply)
- **Navigation** (menu open/close)
- **Time on page** (≥5s threshold per page)
- **Lead capture** (EmailCapture impression, dismiss, submit, success, error)
- **Cookie consent** (accept/decline)

The `AppLink` component (SPA navigation) supports optional `trackEvent`/`trackData` props for declarative click tracking.

---

## Gaspar RAG Assistant

Gaspar is the site assistant exposed through `src/frontend/components/widgets/AssistantWidget.jsx` and served by Netlify Functions. It uses a mounted app under `src/backend/rag/apps/gaspar/` to wire application use cases to concrete infrastructure adapters.

### Runtime Architecture

The RAG code is organized by dependency direction rather than by provider:

| Layer | Path | Responsibility |
|---|---|---|
| **Apps** | `src/backend/rag/apps/` | Concrete app mounts that compose application use cases with infrastructure adapters |
| **Domain** | `src/backend/rag/domain/` | Provider-agnostic types and policies: assistant actions/responses, language policy, conversation intent, retrieval plans/routes, and content/source types |
| **Application** | `src/backend/rag/application/` | Use cases, ports, ingestion pipeline, retrieval orchestration, assistant UI copy, config value types, common helpers, and provider-agnostic prompts |
| **Application Ports** | `src/backend/rag/application/ports/` | Interfaces implemented by infrastructure: answer provider, embedding provider, RAG read/write repositories, provider errors, and embedding index types |
| **Infrastructure** | `src/backend/rag/infrastructure/` | Provider, repository, security, source-loading, extraction, and manifest adapters |
| **Prompts** | `src/backend/rag/application/prompts/` | Provider-agnostic prompt builders for intent, retrieval planning, answering, fallback, and UI translation |
| **Ingestion Loaders** | `src/backend/rag/infrastructure/ingestion/loaders/` | First-party and trusted-external source loaders that create `RagSource` objects |
| **Ingestion Extractors** | `src/backend/rag/infrastructure/ingestion/extractors/` | PDF, HTML, Markdown, and JSON text extraction helpers |
| **Ingestion Manifests** | `src/backend/rag/infrastructure/ingestion/manifests/` | First-party and trusted-external source definitions and manifest types |
| **Tests** | `src/backend/rag/tests/` | Unit tests, route/eval coverage, ingestion tests, security tests, and fakes |

The domain and application layers do not import concrete provider or repository adapters. Provider-specific behavior is isolated under `src/backend/rag/infrastructure/`, and `src/backend/rag/apps/gaspar/` wires those adapters into application use cases.

### Ask Flow

1. `POST /api/assistant/ask` is handled by `netlify/functions/assistant-ask.js`.
2. The function enforces origin checks, ALTCHA verification, and rate limits before calling the `askQuestion` use case with dependencies from `apps/di`.
3. The application use case validates input, applies language preference policy, classifies intent, plans retrieval, resolves a retrieval route, retrieves context through repository ports, and generates the answer through provider ports.
4. The response returns answer text, resolved language, optional language preference updates, citations, article recommendations, and assistant actions such as `book_meeting`, `gaspar_message`, `contact_form`, or `email_hr`.

### Source And Indexing Model

Gaspar reads from the configured RAG repository, not directly from website files at request time. First-party and trusted-external sources are ingested into `rag_sources`/`rag_chunks` tables with metadata, chunk hashes, primary embeddings, and fallback embeddings.

First-party ingestion covers public site content, blog posts, project data, static pages, curated assistant profile content, and private source material under `src/backend/rag/.rag_private/`. Private content is processed through redaction rules before indexing where appropriate.

Useful ingestion commands:

```bash
npm run sync:blog
npm run rag:ingest:local -- --all
npm run rag:ingest:local -- --all --fallback-only
npm run rag:ingest:local -- --all --refresh
npm run rag:ingest:external -- --all
```

### Environment

Required RAG environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase project URL |
| `DATABASE_SERVICE_ROLE_KEY` | Supabase service-role key used by server-side RAG jobs/functions |
| `EMBEDDING_API_KEY` | Embedding provider API key |
| `EMBEDDING_MODEL` | Primary embedding model |
| `FALLBACK_EMBEDDING_MODEL` | Fallback embedding model |
| `AI_MODEL_API_KEY` | Answer provider API key |
| `AI_MODEL` | Answer provider model name |
| `ALTCHA_HMAC_KEY` | Server-side ALTCHA signing/verification key |

Optional tuning variables include `RAG_SITE_URL`, `RAG_COMPANY_NAME`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_MATCH_COUNT`, `RAG_SIMILARITY_THRESHOLD`, `RAG_FALLBACK_SIMILARITY_THRESHOLD`, `EMBEDDING_REQUEST_DELAY_MS`, `ALTCHA_COST`, `ALTCHA_COUNTER_MIN`, `ALTCHA_COUNTER_MAX`, and `RAG_ASK_RATE_LIMIT_SALT`.

### Validation

Run these before changing assistant behavior, retrieval routing, ingestion, provider adapters, or prompts:

```bash
npm run typecheck:rag
npm run rag:test
npm run lint:rag
npm run lint:app
```

---

## Deployment

The `dist/` directory is deployed to Netlify. Netlify redirects in `public/_redirects`:
- **GA4 proxy**: `/g/js` → Google Tag Manager, `/g/collect` → Google Analytics
- **LLM aliases**: `/llm.txt` → `/llms.txt`, `/full-llm.txt` → `/llms-full.txt`
- **Trailing-slash canonicalization**: all routes redirect to trailing-slash variants
- **Legacy redirects**: `/team` → `/partners/`, `/articles/:slug` → `/blog/:slug/`
- **SPA fallback**: all unmatched routes serve `404.html`

Netlify Functions also serve assistant/security endpoints and scheduled maintenance:
- `GET /api/assistant/challenge`: ALTCHA challenge for Gaspar requests
- `POST /api/assistant/ask`: Gaspar RAG endpoint with ALTCHA and rate limiting
- `GET /api/assistant/ui-copy`: localized assistant widget copy
- `GET /api/security/challenge` and `POST /api/security/verify`: ALTCHA flow for protected form submissions
- Scheduled `maintenance-keep-database-alive`: periodically touches Supabase so the RAG database remains warm

---

## For AI Agents

See **[AGENTS.md](./AGENTS.md)** for a comprehensive navigation guide covering architecture patterns, component conventions, analytics usage, build process, common tasks, and gotchas.
