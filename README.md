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
| **Assistant/RAG** | Netlify Functions + Supabase pgvector + DeepSeek + Gemini embeddings |
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
│   └── functions/                # Assistant/contact API functions and scheduled jobs
├── supabase/
│   └── migrations/               # RAG schema, vector search, and rate-limit tables
├── rag/                          # Gaspar assistant RAG domain, runtime, adapters, ingestion, tests
├── scripts/
│   └── import-medium-articles.cjs # Medium blog post importer
├── public/                       # Static assets (fonts, images, redirects, LLM metadata)
└── src/
    ├── main.jsx                  # App entry, provider tree, route definitions
    ├── animations/               # GSAP animation presets
    ├── blog/                     # 34 Markdown blog posts with YAML frontmatter
    ├── components/
    │   ├── accordions/           # Accordion components
    │   ├── actions/              # SocialShareButtons
    │   ├── blog/                 # Blog-specific components
    │   ├── cards/                # BaseCard, FounderCard, ProjectItem
    │   ├── careers/              # Careers-specific components
    │   ├── filters/              # TagFilterPills
    │   ├── forms/                # ContactForm, EmailCaptureForm, FormCard
    │   ├── grids/                # FilterGrid, ImageGallery, Timeline, VerticalTimeline, StepProgressTimeline
    │   ├── headers/              # PageHeader
    │   ├── icons/                # Logo, SocialIcons, AtomIcon, BlueskyIcon, etc.
    │   ├── layout/               # CTASection, Footer, LoadingScreen, Marquee, SectionDivider, ErrorBoundary
    │   ├── navigation/           # AppLink, Breadcrumb, Navbar, NavMenu, Pagination, ArticleSidebar
    │   ├── overlays/             # CookieConsent, Drawer
    │   ├── pills/                # Pill, PillButton
    │   ├── seo/                  # SEO component (react-helmet-async wrapper)
    │   └── widgets/              # CounterWidget, ShuffleText, TechStackConsole
    ├── constants/                # Shared constants (config, UI thresholds)
    ├── data/                     # JSON/JS data files (about, faq, jobs, menu, partners, projects, services, sitelinks)
    ├── hooks/                    # Custom hooks (useScrollAnimations, useBlogSearch, useHashScroll, etc.)
    ├── pages/
    │   ├── home/                 # HomePage + section components
    │   ├── blog/                 # BlogPage (listing) + BlogPostPage (detail)
    │   ├── AboutUsPage.jsx
    │   ├── CareersPage.jsx
    │   ├── ContactPage.jsx
    │   ├── PartnersPage.jsx
    │   ├── PrivacyPage.jsx
    │   ├── ProjectDetailPage.jsx
    │   ├── ProjectsPage.jsx
    │   ├── TermsPage.jsx
    │   ├── WorkingWithUsPage.jsx
    │   └── NotFoundPage.jsx
    ├── providers/                # Context providers (Loading, RAF, Lenis, Transition)
    ├── services/                 # External link resolution (linksService.js)
    ├── styles/                   # CSS files (base, components, home, blog, projects, partners, careers, etc.)
    └── utils/                    # Analytics, blog parser, helpers, structured data, lazy retry
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
| `npm run blog:import:medium` | Import published Medium articles into `src/blog/` |
| `npm run blog:import:medium:drafts` | Import Medium drafts |
| `npm run sync:blog` | Import Medium posts and re-index local RAG sources |
| `npm run rag:ingest:local` | Index local website/blog/project/private sources into Supabase |
| `npm run rag:ingest:external` | Index configured trusted external sources |
| `npm run rag:embeddings:rebuild:fallback` | Rebuild fallback embedding vectors |
| `npm run rag:ask:test` | Ask Gaspar from the CLI using the same runtime wiring |
| `npm run rag:test` | Run the RAG test and eval suite |
| `npm run typecheck:rag` | Type-check the TypeScript RAG code |
| `npm run supabase:link` | Link the local Supabase CLI project |
| `npm run supabase:push` | Push Supabase migrations |

---

## Path Aliases

Vite config defines these import aliases (see `vite.config.js`):

| Alias | Resolves to |
|---|---|
| `@components` | `src/components` |
| `@hooks` | `src/hooks` |
| `@constants` | `src/constants` |
| `@providers` | `src/providers` |
| `@utils` | `src/utils` |
| `@services` | `src/services` |
| `@data` | `src/data` |
| `@styles` | `src/styles` |

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

All GA4 tracking is centralized in `src/utils/analytics.js`. Tracked events include:
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

Gaspar is the site assistant exposed through `src/components/widgets/AssistantWidget.jsx` and served by Netlify Functions. It uses Supabase as the source store/vector index, DeepSeek for answer generation and classification, and Gemini for primary/fallback embeddings.

### Runtime Architecture

The RAG code is organized by dependency direction rather than by vendor:

| Layer | Path | Responsibility |
|---|---|---|
| **Domain** | `rag/domain/` | Provider-agnostic types and policies: assistant actions/responses, language policy, conversation intent, retrieval plans/routes, content/source types, provider ports/errors |
| **Runtime** | `rag/runtime/` | Use-case flow for asking questions, validating input, routing retrieval, creating citations/actions/recommendations, and serving assistant UI copy |
| **Application** | `rag/application/` | Cross-runtime application helpers such as assistant UI copy normalization |
| **Repositories** | `rag/repositories/` | Read/write repository ports used by runtime and ingestion |
| **Infrastructure** | `rag/infrastructure/` | DeepSeek, Gemini, Supabase adapters, row mapping, vector helpers, and `createRagRuntime()` composition root |
| **Ingestion** | `rag/ingestion/` | Source manifests, extractors, redaction, chunking, content hashing, and indexing pipeline |
| **Security** | `rag/security/` | ALTCHA challenge verification and Supabase-backed rate limits |
| **Prompts** | `rag/prompts/` | Provider-agnostic prompt builders for intent, retrieval planning, answering, fallback, and UI translation |
| **Tests** | `rag/tests/` | Unit tests, route/eval coverage, ingestion tests, security tests, and fakes |

The domain layer does not import DeepSeek, Gemini, Supabase, or framework code. Provider-specific behavior is isolated under `rag/infrastructure/`, and `rag/infrastructure/createRagRuntime.ts` wires concrete adapters into the runtime use cases.

### Ask Flow

1. `POST /api/assistant/ask` is handled by `netlify/functions/ask.js`.
2. The function enforces origin checks, ALTCHA verification, and rate limits before calling `createRagRuntime().askQuestion()`.
3. The runtime validates input, applies language preference policy, classifies intent, plans retrieval, resolves a retrieval route, retrieves context from Supabase/vector search, and generates the answer.
4. The response returns answer text, resolved language, optional language preference updates, citations, article recommendations, and assistant actions such as `book_meeting`, `gaspar_message`, `contact_form`, or `email_hr`.

### Source And Indexing Model

Gaspar reads from Supabase, not directly from website files at request time. Local and external sources are ingested into `rag_sources`/`rag_chunks` tables with metadata, chunk hashes, primary embeddings, and fallback embeddings.

Local ingestion covers public site content, blog posts, project data, static pages, curated assistant profile content, and private source material under `rag/.rag_private/`. Private content is processed through redaction rules before indexing where appropriate.

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
| `EMBEDDING_API_KEY` | Gemini embedding API key |
| `EMBEDDING_MODEL` | Primary embedding model |
| `FALLBACK_EMBEDDING_MODEL` | Fallback embedding model |
| `AI_MODEL_API_KEY` | DeepSeek API key |
| `AI_MODEL` | DeepSeek model name |
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

Netlify Functions also serve assistant/contact endpoints and scheduled maintenance:
- `GET /api/assistant/challenge`: ALTCHA challenge for Gaspar requests
- `POST /api/assistant/ask`: Gaspar RAG endpoint with ALTCHA and rate limiting
- `GET /api/assistant/ui-copy`: localized assistant widget copy
- `GET /api/contact/challenge` and `POST /api/contact/verify`: ALTCHA flow for contact submissions
- Scheduled `keepDatabaseAlive`: periodically touches Supabase so the RAG database remains warm

---

## For AI Agents

See **[AGENTS.md](./AGENTS.md)** for a comprehensive navigation guide covering architecture patterns, component conventions, analytics usage, build process, common tasks, and gotchas.
