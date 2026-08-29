# AGENTS.md — AI Agent Navigation Guide

> **Purpose:** Help AI coding agents (OpenCode, Claude, Cursor, etc.) understand this codebase
> quickly so they can make accurate, idiomatic changes. Read this before editing any file.

---

## 1. Project Overview

**arg.software** — the corporate website for ARG Software, a Portugal-based software
studio specializing in fintech, media, and high-growth tech. Built as a single-page
React application (SPA) with client-side routing, server-side prerendering for SEO,
and comprehensive Google Analytics 4 instrumentation.

| Aspect | Detail |
|---|---|
| **Stack** | React 18, React Router 7, Vite 7, GSAP 3, Three.js, Lenis, vanilla CSS |
| **Routing** | `react-router-dom` with both `/path` and `/path/` variants |
| **SEO** | Custom Vite plugin prerenders 51 HTML files + generates sitemap/RSS/Atom |
| **Styling** | Plain CSS files (no CSS-in-JS, no Tailwind) — organized by page/component |
| **Analytics** | GA4 via gtag — all tracking centralized in `src/frontend/utils/analytics.js` |
| **Build** | `npm run build` → lint:fix → Vite → prerender → image optimization |
| **Lint** | ESLint 9 with React + React Hooks + Prettier plugins |
| **Test** | Backend/API suites via npm scripts; no frontend test suite currently configured |

---

## 2. Directory Structure

```
├── index.html              # HTML shell — OG meta, JSON-LD, GA4 bootstrap, font preloads
├── vite.config.js          # Vite config — plugins, manualChunks, path aliases, SPA fallback
├── plugins/
│   └── seo-prerender/      # Custom build plugin — prerendered pages + sitemap/RSS/Atom (see § 5)
├── scripts/                # Import and maintenance scripts
├── package.json            # Dependencies & scripts
├── public/                 # Static assets served as-is
├── netlify/                # Netlify function and edge-function adapters
├── supabase/               # Supabase config, migrations, and helper scripts
└── src/
    ├── backend/
    │   ├── admin/          # Admin API, domain, application, and infrastructure
    │   ├── maintenance/    # Scheduled maintenance API, application, and infrastructure
    │   ├── mcp/            # Public discovery MCP API
    │   ├── rag/            # Gaspar apps, domain, application, infrastructure, ingestion, tests
    │   └── shared/         # Shared backend HTTP utilities
    ├── frontend/
    │   ├── main.jsx        # React entry — providers shell, route table, lazy imports
    │   ├── animations/     # GSAP animation attribute presets
    │   ├── blog/           # Markdown blog posts with YAML frontmatter
    │   ├── components/     # App-specific React components
    │   ├── constants/      # Shared frontend constants
    │   ├── data/           # Frontend JSON/JS data files
    │   ├── hooks/          # Custom React hooks
    │   ├── pages/          # Route components
    │   ├── providers/      # Context providers
    │   ├── services/       # Frontend services
    │   ├── styles/         # Frontend CSS files
    │   ├── utils/          # Analytics, blog parser, helpers, structured data, lazy retry
    │   └── workers/        # Frontend web workers
    └── packages/
        └── ui/             # Shared UI package and Storybook stories
```

---

## 3. Architecture Patterns

### 3.1 Routing
- All routes are defined in `src/frontend/main.jsx`
- Both `/path` and `/path/` variants exist for each route
- Blog posts: `/blog/:slug/` renders `BlogPostPage` with `slug` from URL params
- Project detail: `/projects/:slug/` renders `ProjectDetailPage`
- `/projects` and `/projects/` redirect to first project via `ProjectsPage`
- 404 catch-all: `<Route path="*" element={<NotFoundPage />} />`
- Global overlays (`AssistantWidget` + `CookieConsent`) rendered outside `<Routes>`

### 3.2 Provider Stack (innermost → outermost)
```
LoadingProvider → HelmetProvider → BrowserRouter →
  RAFProvider → LenisProvider → TransitionProvider →
    ErrorBoundary → Suspense → <Routes>
```
- `LoadingProvider`: global loading state
- `HelmetProvider`: `<head>` tag management per page
- `RAFProvider`: shared requestAnimationFrame loop
- `LenisProvider`: smooth scrolling
- `TransitionProvider`: page-to-page transition animations + `trackPageView`
- `ErrorBoundary`: catches render errors

### 3.3 Page Transitions
- `TransitionProvider` in `src/frontend/providers/TransitionProvider.jsx` handles all cross-page navigation
- Uses a horizontal/vertical overlay animation via GSAP
- Automatically calls `trackPageView()` on every SPA route change
- Calls `window.scrollTo(0, 0)` or custom Lenis scroll on navigation
- Exports `scrollToPage()` and `scrollToHash()` functions via context

### 3.4 Lazy Loading
All pages except `HomePage` are lazy-loaded via `lazyWithRetry()` in `main.jsx`:
```js
const PartnersPage = lazyWithRetry(() => import('./pages/PartnersPage.jsx'));
const BlogPage = lazyWithRetry(() => import('./pages/blog/BlogPage.jsx'));
// ... etc
```
`lazyWithRetry` (in `src/frontend/utils/lazyWithRetry.js`) wraps `React.lazy` with automatic retry on chunk load failure.

### 3.5 Path Aliases
Vite config defines import aliases for cleaner imports:
```js
import { Navbar } from '@components/navigation/Navbar';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { trackCTA } from '@utils/analytics';
import { getProjectBookingLink } from '@services/linksService';
```
Available aliases: `@components`, `@hooks`, `@constants`, `@providers`, `@utils`, `@services`, `@data`, `@styles`.

### 3.6 Scroll Animations
- `useScrollAnimations.js` — main animation hook
- Uses `data-animate-scope`, `data-animate`, `data-animate-preset`, `data-animate-stagger`, etc.
- Supported presets: `fade-up`, `slide-from-left`, `slide-from-right`, `zoom-in`, `width-countup`, `overlay-reveal`, `gsap-scale`
- Sets up IntersectionObserver + GSAP `fromTo` tweens
- Cleans up inline `transform` after animation to prevent CSS hover conflicts

### 3.7 Blog System
- Posts are Markdown files in `src/frontend/blog/` with YAML frontmatter
- Naming convention: `{slug}.md` (e.g. `angular-5-to-19-migration.md`)
- Parsed at build time and runtime via `src/frontend/utils/blog/`
- Metadata cached in `window.__BLOG_POSTS_METADATA__` after first load
- Syntax highlighting via highlight.js on `BlogPostPage`
- RSS/Atom feeds auto-generated by `plugins/seo-prerender/` at build time
- Medium import: `npm run blog:import:medium` fetches from Medium feed

### 3.8 External Links Service
- `src/frontend/services/linksService.js` centralizes all external URLs
- Reads from `src/frontend/data/siteLinks.json`
- Provides typed getters: `getProjectBookingLink()`, `getNewsletterSubscribeLink()`, `getProjectBriefFormLink()`, etc.
- Also provides email, social, and share URL builders
- Never hardcode external URLs in components — always use this service

### 3.9 Admin Backend Boundaries
- Domain stays small and business-focused. It should own real business invariants only.
- Domain must not know about HTTP status codes, request/response shapes, Supabase rows, CSV parsing, encryption/decryption, hashing, cookies, or persistence details.
- Application owns use cases, error-to-status mapping, ports, and generic reusable mechanics.
- Repository ports live in `src/backend/admin/application/ports/repositories/`.
- User/session operations live in application use cases under `src/backend/admin/application/usecases/sessions/` and `src/backend/admin/application/usecases/users/`; controllers should only call those use cases and handle HTTP details.
- Identity provider ports use user naming, such as `IUserIdentityProvider`; keep `Admin` naming for admin routes/config only.
- Admin configuration should be exposed through an application-level interface, not by passing the concrete `AdminConfig` into infrastructure. Inject the configuration interface anywhere configuration is genuinely needed.
- Generic crypto helpers live in `src/backend/admin/application/crypto/` as simple functions such as `encode`, `decode`, and `encodeIndex`; do not duplicate cipher logic per repository or domain type.
- Admin HTTP endpoints should use controller-style apps under `src/backend/admin/apps/api/`.
- Netlify functions are deployment adapters only. Keep Netlify `config` objects and schedules in `netlify/functions/*`; API route behavior belongs in the backend API app.
- Scheduled maintenance behavior belongs in `src/backend/maintenance/apps/api/`; Netlify scheduled functions should only keep deployment schedules and call maintenance API runner exports.
- `src/backend/admin/apps/api/api.ts` is the executable admin API entrypoint. It exports grouped router handlers such as `routeAuthRequest`, `routeOutreachRequest`, `routeVisitRequest`, and `routeAssistantConversationRequest`.
- Admin controllers live under `src/backend/admin/apps/api/controllers/` and export their own route factories.
- Admin controller methods should declare method/path and error metadata with `@route(...)` and `@errorResponse(...)`. Controller methods should not dispatch internally on HTTP method, query `scope`, IDs, or payload `action` values.
- Admin controllers orchestrate HTTP only: read request body/query/cookies, call use cases, and return `Response`.
- Protected admin controller methods should call `this.authenticateUser(request)` before parsing body/query or calling business use cases. Keep authorization out of non-auth business use cases.
- Controllers must not talk to repositories, providers, Supabase clients, config, env, or dependency factories.
- Controllers may receive dependencies through constructors, but those dependencies should be real use cases or use-case services, not env/config/repository containers.
- Controller constructors should not default dependencies from `adminContainer` or `ragContainer`; route factories and API composition are the wiring boundary.
- DI is the composition root. It should resolve env/config internally, construct infrastructure adapters, construct use cases with explicit dependencies, and export a runtime container.
- Use cases should receive their dependencies directly through constructors, following a .NET-style dependency injection model. Avoid opaque dependency objects when explicit constructor dependencies make the use case clearer.
- Each controller method should call a use case. Reuse an existing use case when behavior is repeated; add a new use case when controller logic would otherwise reach into repositories/providers.
- Supabase client creation belongs in the DI composition root/container, not in a separate generic factory file, unless reuse outside the container proves necessary.
- Supabase adapter constructors should be consistent: receive the `SupabaseClient` first, then explicit adapter dependencies such as configuration interfaces or salts.
- App-level HTTP helpers, such as cookie and request-header extraction, live in `src/backend/admin/apps/http/` because they are API concerns.
- Admin route dispatch owns CORS, OPTIONS, 404, and 405 behavior. Controller error responses belong to `@errorResponse(...)`.
- Rate limiting belongs at the controller/API boundary for public write endpoints. Use cases should not receive client IPs or rate-limit dependencies.
- Controllers should depend on the shared `IRateLimiter` contract from `src/backend/shared/security/ratelimit.ts`, not free functions, repositories, stores, or Supabase clients.
- Production rate-limit persistence belongs in shared infrastructure repositories, currently `SupabaseRateLimitRepository` under `src/backend/shared/infrastructure/repositories/supabase/`.
- In-memory rate-limit repositories are test fakes only unless there is an explicit local/dev runtime requirement.
- Same-origin/origin checks and rate limits are complementary: origin checks reduce cross-site browser abuse, while rate limits protect public unauthenticated write endpoints from volume/script abuse.
- Infrastructure owns concrete adapters such as Supabase repositories, identity providers, geolocation providers, and CSV parser implementations.
- Supabase repositories should connect table columns to domain objects directly in the repository unless the conversion is reused. Avoid vague helper files that only rename simple row mapping.
- Keep table-specific conversion near the repository because DB columns and encrypted field envelopes are persistence details.
- One-time scripts should not drive architecture. Disable or update them when needed instead of preserving stale helper APIs for them.
- Centralized constants are useful when they define a stable contract, such as outreach CSV columns, but avoid deriving exported shapes implicitly from runtime object keys.

### 3.10 Admin API Current State
- `src/backend/admin/apps/api/api.ts` is the only admin API router entrypoint. There is no separate `router.ts`.
- `api.ts` defines route groups and exports Netlify/local handlers: `routeAdminRequest`, `routeAuthRequest`, `routeUserRequest`, `routeOutreachRequest`, `routeVisitRequest`, and `routeAssistantConversationRequest`.
- `src/backend/admin/apps/api/controllerroute.handler.ts` dispatches registered controller routes and owns CORS, origin guard, OPTIONS, 404, and 405 behavior.
- Controllers live in `src/backend/admin/apps/api/controllers/` and keep route/error declarations beside methods using `@route(...)` and `@errorResponse(...)`.
- Keep `methoddecorator.ts`, `routeregistry.ts`, `route.ts`, and `error.response.ts`; they intentionally make controllers cleaner.
- Do not reintroduce `@cors`, `@options`, `allowMethods`, `BaseApi`, route files per controller, or `src/backend/admin/apps/api/router.ts` unless there is a concrete reason.
- `ControllerBase` is admin-specific and intentionally small: `authenticateUser(request)`, `json(...)`, `body(...)`, `query(...)`, `errorBody(...)`, and `errorStatus(...)`.
- Protected admin controller methods should authenticate first with `this.authenticateUser(request)`, then parse body/query, then call business use cases.
- Non-auth business use cases should not perform authorization. Auth/session use cases may still use `UserAccessPolicy` because authentication and session validation are their purpose.
- Public write endpoints are rate-limited at controller level: `POST /api/admin/login`, `POST /api/visit-log`, `POST /api/admin/assistant-conversation-log`, and `POST /api/assistant/ask`.
- `POST /api/admin/assistant-conversation-log` is public despite the `/api/admin/...` path; do not require an admin session for assistant conversation saves.
- `netlify/functions/admin.js` handles admin feature endpoints. Keep route-specific deployment adapters only when Netlify config needs to differ, such as `assistant-conversation-log.js`, `visit-log.js`, and scheduled maintenance functions.
- Recent verification passed: `npm run test:backend`, `npm run typecheck:backend`, `npm run lint:backend`, and `npm run test:netlify`.

---

## 4. Analytics

### 4.1 Centralized Tracking (`src/frontend/utils/analytics.js`)
All GA4 events go through this module. Never call `window.gtag()` directly.

| Function | Event | Parameters |
|---|---|---|
| `trackEvent(name, params)` | arbitrary | Generic GA4 event |
| `trackPageView(path, title)` | `page_view` | `page_path`, `page_title` |
| `trackCTA(type, location)` | `cta_click` | `cta_type`, `cta_location` |
| `trackOutbound(url, label, location)` | `outbound_click` | `link_url`, `link_label`, `link_location` |
| `trackSocial(platform, location)` | `social_click` | `platform`, `link_location` |
| `trackBlogPostShare(platform, slug)` | `blog_post_share` | `platform`, `blog_post_slug` |
| `trackMailto(subject, location)` | `mailto_click` | `subject`, `link_location` |
| `trackTimeOnPage(pagePath, seconds)` | `time_on_page` | `page_path`, `duration_seconds` |
| `trackFAQOpen(questionText)` | `faq_open` | `question` |
| `trackBlogPostClick(slug, title, location)` | `blog_post_click` | `blog_post_slug`, `blog_post_title`, `link_location` |
| `trackConsent(action)` | `cookie_consent` | `consent_action` |

### 4.2 AppLink Component (`src/frontend/components/navigation/AppLink.jsx`)
- Wraps React Router's `<Link>` with optional analytics props
- Props: `trackEvent` (string), `trackData` (object)
- Fires `trackEvent(trackEvent, trackData)` BEFORE navigation
- Does NOT automatically track every click — explicit props required
- Use for client-side navigation that needs analytics

### 4.3 useTimeOnPage Hook (`src/frontend/hooks/useTimeOnPage.js`)
- Takes `pagePath` (string) and optional `minSeconds` (default 5)
- Starts timer on mount, fires `time_on_page` event on unmount if threshold met
- Built-in 5-second minimum to filter accidental bounces

### 4.4 Event Naming Convention
- Use `snake_case` for event names: `blog_post_click`, `partner_filter_click`
- Consistent with existing `cta_click`, `outbound_click` patterns
- Never include PII-sensitive data (email domains, user IDs) in event parameters

---

## 5. SEO Infrastructure (`plugins/seo-prerender/`)

Custom Vite plugin that runs during `closeBundle`. Generates:

1. **51 prerendered HTML files** — one per route, with correct `<title>`, `og:*`, `twitter:*`
2. **sitemap.xml** — all URLs with priority and changefreq
3. **rss.xml** — RSS 2.0 feed of all 34 blog posts
4. **atom.xml** — Atom 1.0 feed of all 34 blog posts
5. **Crawlable nav blocks** — static `<nav>` with all site links for Ahrefs/crawlers
6. **Project detail pages** — prerendered with per-project OG tags

### Key Config
- `SITE_URL`: `https://arg.software`
- `STATIC_PAGES`: Partners, Blog, Careers, Working with Us, About Us, Contact, Privacy, Terms (8 pages)
- `PROJECTS`: 7 projects loaded from `src/frontend/data/projects.json`
- Sitemap priorities: blog `0.7`, projects `0.6`, pages `0.8`, privacy/terms `0.3`
- Feeds only generated in production builds

### Plugin Structure
- `index.js` — main plugin entry
- `constants.js` — site URL, nav links, static page definitions
- `blog-loader.js` — loads and parses blog post frontmatter
- `html-utils.js` — HTML manipulation helpers
- `links.js` — link generation
- `crawlable-block.js` — static nav block generator
- `pages/` — per-page prerender writers
- `feeds/` — sitemap, RSS, Atom generators

---

## 6. Component Conventions

### 6.0 Code Simplification
- Prefer the simplest readable implementation across the whole codebase.
- Do not add new types, interfaces, helper functions, classes, wrappers, factories, or params objects unless they are clearly needed for reuse, clarity, or an existing pattern.
- Do not use `Partial` for method inputs unless explicitly requested.
- Prefer passing existing domain/application objects over creating method-specific DTO types.
- Keep one-line logic inline instead of extracting it to a helper.
- Keep behavior close to the code/data it belongs to; avoid moving logic into generic utilities unless it is reused.
- For class-owned validation or normalization, prefer private class members over free helper functions.
- Prefer direct immutable data shapes, such as `readonly` properties, over getters, setters, backing fields, and response wrappers unless there is a concrete need.
- Keep only real business invariants in domain/application objects. Do not add redundant validation for values generated or enforced elsewhere, such as database IDs or client-generated UUIDs.
- Do not normalize, sanitize, trim, reformat, or truncate data in domain code when that belongs to the API boundary or would silently change user/client data.
- Preserve source data by default, especially transcripts, messages, imported records, and user-provided text. Derived display fields such as previews may be shortened separately.
- Put security, encryption/decryption, persistence mapping, and HTTP response shaping outside domain objects.
- Keep generic reusable mechanics such as crypto encode/decode in application helpers; keep adapter-specific details such as Supabase columns in infrastructure repositories.
- Prefer direct repository-local column-to-domain conversion over separate mapper/helper files unless the conversion is reused or genuinely complex enough to justify extraction.
- Prefer explicit imperative code with local variables and `if` statements over clever conditional spreads, nested ternaries, or `flatMap` tricks when constructing objects.
- Before adding any abstraction, ask whether it reduces code or just names code. If it only names code, do not add it.

### 6.1 Imports
- No barrel exports — import directly from component files
- Use path aliases: `import { Navbar } from '@components/navigation/Navbar'`
- Page files import their own CSS: `import '../styles/blog.css'`
- Backend TypeScript files use NodeNext runtime `.js` specifiers for relative internal imports; Netlify JavaScript adapters may import backend `.ts` entrypoints at the deployment boundary.

### 6.2 Naming
- Components: PascalCase files, named exports preferred
- Custom hooks: camelCase, `use*` prefix
- Service, utility, constant, and multi-word JSON module files: camelCase
- Backend files: lowercase names with no word separators, plus `.` before terminal role suffixes such as `.types`, `.config`, `.controller`, `.repository`, `.provider`, `.parser`, `.usecase`, `.error`, `.handler`, `.container`, `.cookies`, `.logger`, and `.api`.
- CSS, blog Markdown slugs, and generated/static route-oriented files: kebab-case or lowercase
- CSS classes: kebab-case, scoped by page/component prefix (e.g. `footer-`, `pc-`, `pt-`)
- Analytics events: `snake_case`

### 6.3 CSS Scoping
- Page-specific styles: separate CSS file in `src/frontend/styles/` (e.g. `partners.css`, `blog.css`)
- Global styles: `base.css` (original Webflow CSS)
- Component styles: `components.css`
- Pattern: prefix classes with page/component abbreviation
  - `pc-*` = Partners page components
  - `pt-*` = Partners timeline
  - `bp-*` = Blog post page
  - `blp-*` = Blog listing page
  - `prp-*` = Project detail page
  - `cp-*` = Careers page
  - `footer-*` = Footer
  - `nav-menu__*` = Navigation menu
  - `section_*` = Layout sections
  - `aw-*` = Assistant widget

---

## 7. External Dependencies & Config

### 7.1 npm Packages
- `react` + `react-dom` 18.2 — UI framework
- `react-router-dom` 7.17 — SPA routing
- `react-helmet-async` 3.0 — `<head>` tag management
- `gsap` 3.14 — Scroll + page transition animations
- `lenis` 1.3 — Smooth scrolling
- `three` 0.183 — 3D scenes (404 page, sphere background)
- `highlight.js` 11.11 — Blog code syntax highlighting

### 7.2 External Services
- **GA4**: `G-79TG4N6C2W` — loaded dynamically (skipped on localhost), proxied via Netlify
- **Web3Forms**: form submission endpoint for assistant lead capture and general forms (configured via `siteLinks.json`)
- **Social**: GitHub, LinkedIn, Medium profiles

### 7.3 Build Plugins
- `@vitejs/plugin-react` — JSX transform
- `vite-plugin-image-optimizer` — auto JPEG/PNG/WebP/SVG optimization
- `plugins/seo-prerender/` — custom prerender + sitemap + feeds
- `eslint` 9 + react + hooks + prettier plugins

### 7.4 Vite Config (`vite.config.js`)
- Dev server: port 3000, auto-open browser
- Path aliases: `@components`, `@hooks`, `@constants`, `@providers`, `@utils`, `@services`, `@data`, `@styles`
- Manual chunks: `vendor` (React/Router/Helmet), `three`, `gsap`, `hljs`
- Local API routes: mounted through `plugins/local-api-dev/`, loaded with Vite SSR transforms, and delegated to backend API route handlers/factories
- SPA fallback middleware for dev server
- CSS preload injection plugin
- Production: drops `console` and `debugger` statements

---

## 8. Build Process

```
npm run build
  → eslint src plugins --ext .js,.jsx --fix   (lint + auto-fix)
  → vite build                                 (bundle + minify)
    → vite-plugin-image-optimizer              (optimize images)
    → seo-prerender plugin                     (generate HTML files + sitemap + RSS + Atom)
    → preload-css plugin                       (inject CSS <link rel="preload">)
```

Build output: `dist/` directory ready for deployment.

---

## 9. Common Tasks & Gotchas

### Adding a New Page
1. Create the page component in `src/frontend/pages/`
2. Add route in `src/frontend/main.jsx` (with and without trailing slash)
3. Lazy-load with `lazyWithRetry()` if not homepage
4. Add entry to `STATIC_PAGES` in `plugins/seo-prerender/constants.js` for prerendering + sitemap
5. Add trailing-slash redirect in `public/_redirects`
6. Add SEO metadata (title, description) in the page component

### Adding a New Blog Post
1. Create `src/frontend/blog/{slug}.md` with YAML frontmatter:
   ```yaml
   ---
   slug: my-post-slug
   title: My Post Title
   subtitle: Short subtitle
   seoTitle: SEO-optimized title (optional, falls back to title)
   tag: Category Name
   date: 2025-01-15
   readTime: 8 min read
   image: /images/blog/.../header.webp
   ---
   ```
2. Rebuild — sitemap, RSS, and Atom are auto-generated
3. Or use `npm run blog:import:medium` to import from Medium feed

### Making a Link with Analytics
```jsx
// Internal navigation with tracking
<AppLink
  to="/projects/mojaloop/"
  trackEvent="project_click"
  trackData={{ project: 'mojaloop', location: 'homepage' }}
>
  View Project
</AppLink>

// External link with CTA tracking
<a
  href={getProjectBookingLink()}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => trackCTA('book_meeting', 'navbar')}
>
  Book a Meeting
</a>
```

### Using External Links
```jsx
import { getProjectBookingLink, getMailtoLink, getCompanySocialLinks } from '@services/linksService';

// Never hardcode external URLs — always use the service
const bookingUrl = getProjectBookingLink();
const mailto = getMailtoLink('hello', 'Project inquiry');
const socials = getCompanySocialLinks();
```

### Tracking Time on Page
```jsx
export default function MyPage() {
  useTimeOnPage('/my-page/');  // fires time_on_page on unmount after 5s
  // ... rest of component
}
```

### Assistant Rate Limits and Logging
- Assistant rate-limit notices are display-only assistant bubbles with `source: 'rate_limit_notice'` and must be excluded from AI conversation context.
- The assistant widget should show natural first-person cooldown or handoff copy from `src/frontend/data/assistant.json` rather than raw API error text.
- Conversation logging should keep periodic saves, visibility/pagehide saves, and avoid idle flushes while an assistant response is still loading.
- Discord webhook notifications for assistant conversations should be sent only when the conversation is first created, not on every upsert/save.

### Animation Guidelines
- Use `useScrollAnimations()` hook for scroll-triggered animations
- Use `data-animate-scope` on parent, `data-animate="preset"` on children
- Presets: `fade-up`, `slide-from-left`, `slide-from-right`, `zoom-in`, `width-countup`
- Stagger: `data-animate-default-stagger="100"` on scope parent
- Order override: `data-animate-order="2"` on individual elements
- Components like `FilterGrid`, `Timeline` accept optional `animate`/`preset`/`stagger` props

### When to Use AppLink vs Plain `<a>`
- **AppLink**: Internal SPA navigation (client-side routing, no full reload)
- **Plain `<a>`**: External URLs, mailto links, page anchors (`#section`)

### Deprecated Code
- `App.jsx` — Removed; routing is now in `main.jsx` directly.
- Barrel exports (`src/frontend/components/index.js`, `src/frontend/hooks/index.js`) — Removed; use direct imports with aliases.

---

## 10. Key Files Reference

| File | Purpose |
|---|---|
| `src/frontend/main.jsx` | App entry — provider stack, route definitions |
| `src/frontend/utils/analytics.js` | All GA4 tracking functions |
| `src/frontend/services/linksService.js` | External link resolution, emails, socials, share URLs |
| `src/frontend/components/navigation/AppLink.jsx` | Enhanced Link with analytics props |
| `src/frontend/providers/TransitionProvider.jsx` | Page transitions + scroll + page view tracking |
| `plugins/seo-prerender/` | Build-time SEO — prerender, sitemap, RSS, Atom |
| `plugins/seo-prerender/constants.js` | Static pages, nav links, site URL |
| `vite.config.js` | Build config — plugins, chunks, aliases, SPA fallback |
| `index.html` | HTML shell — OG tags, JSON-LD, GA4 bootstrap, font preloads |
| `src/frontend/data/projects.json` | Project data (7 projects) |
| `src/frontend/data/siteLinks.json` | All external URLs, emails, social links |
| `src/frontend/utils/blog/` | Blog frontmatter parser + metadata loader |
| `src/frontend/utils/lazyWithRetry.js` | Lazy loading with chunk retry |
| `public/_redirects` | Netlify redirect rules |
| `public/robots.txt` | Crawler directives |
| `public/llms.txt` | LLM metadata |
| `src/frontend/components/widgets/AssistantWidget.jsx` | Assistant widget UI, deterministic lead capture, and proactive offer flow |
| `src/frontend/hooks/useLeadCaptureVisibility.js` | Lead-capture offer visibility rules for the assistant widget |
| `src/frontend/services/assistantActionsService.js` | Assistant CTA action mapping (e.g. `email_hello` → in-chat lead capture) |
| `src/frontend/workers/altchaPbkdf2Worker.js` | Web Worker used for browser-side ALTCHA proof-of-work solving |
| `src/backend/shared/security/ratelimit.ts` | Shared rate-limit contracts and `RateLimiter` implementation |
| `src/backend/shared/infrastructure/repositories/supabase/supabaseratelimit.repository.ts` | Production Supabase-backed rate-limit repository |
| `src/backend/shared/api/controllerbase.ts` | Shared API helpers, including controller-level rate-limit checks |
| `src/backend/rag/tests/fakes/inmemoryratelimit.repository.ts` | Test-only in-memory rate-limit repository fake |
