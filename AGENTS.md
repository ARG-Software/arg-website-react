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
| **Analytics** | GA4 via gtag — all tracking centralized in `src/utils/analytics.js` |
| **Build** | `npm run build` → lint:fix → Vite → prerender → image optimization |
| **Lint** | ESLint 9 with React + React Hooks + Prettier plugins |
| **Test** | No automated test suite currently configured |

---

## 2. Directory Structure

```
├── index.html              # HTML shell — OG meta, JSON-LD, GA4 bootstrap, font preloads
├── vite.config.js          # Vite config — plugins, manualChunks, path aliases, SPA fallback
├── plugins/
│   └── seo-prerender/      # Custom build plugin — prerendered pages + sitemap/RSS/Atom (see § 5)
├── scripts/
│   └── import-medium-articles.cjs  # Medium blog post importer
├── package.json            # Dependencies & scripts
├── public/                 # Static assets served as-is
│   ├── _redirects          # Netlify redirects (GA4 proxy, LLM aliases, trailing-slash, legacy)
│   ├── _headers            # Netlify headers
│   ├── files/              # PDFs (portfolio.pdf)
│   ├── fonts/              # Neue Montreal WOFF fonts
│   ├── images/             # Blog images, partners, projects, homepage, og.jpg
│   ├── icons/              # PWA icons
│   ├── llms.txt            # LLM metadata
│   ├── llms-full.txt       # Full LLM metadata
│   ├── robots.txt          # Crawler directives
│   └── videos/             # Video assets
└── src/
    ├── main.jsx            # React entry — providers shell, route table, lazy imports
    ├── animations/         # GSAP animation attribute presets
    ├── blog/               # 34 Markdown blog posts with YAML frontmatter
    ├── components/
    │   ├── accordions/     # Accordion components
    │   ├── actions/        # SocialShareButtons
    │   ├── blog/           # Blog-specific components
    │   ├── cards/          # BaseCard, FounderCard, ProjectItem
    │   ├── careers/        # Careers-specific components
    │   ├── filters/        # TagFilterPills
    │   ├── forms/          # ContactForm, EmailCaptureForm, FormCard
    │   ├── grids/          # FilterGrid, ImageGallery, Timeline, VerticalTimeline, StepProgressTimeline
    │   ├── headers/        # PageHeader
    │   ├── icons/          # Logo, SocialIcons, AtomIcon, BlueskyIcon, CopyIcon, etc.
    │   ├── layout/         # CTASection, Footer, LoadingScreen, Marquee, SectionDivider, SectionTicker, ErrorBoundary, PageTransitionOverlay
    │   ├── navigation/     # AppLink, Breadcrumb, Navbar, NavMenu, Pagination, SimpleCarousel, ArticleSidebar
    │   ├── overlays/       # CookieConsent, Drawer
    │   ├── pills/          # Pill, PillButton
    │   ├── seo/            # SEO (react-helmet-async wrapper)
    │   └── widgets/        # CounterWidget, ShuffleText, TechStackConsole
    ├── constants/          # Shared constants (config, UI thresholds)
    ├── data/               # JSON/JS data files
    │   ├── about.json      # About page content
    │   ├── faq.js          # FAQ items
    │   ├── jobs.json       # Open job listings
    │   ├── menu.json       # NavMenu configuration
    │   ├── partners.json   # Partners/clients with timeline data
    │   ├── projectGallery.js  # Project gallery images
    │   ├── projects.json   # 7 project detail entries (slug, images, metrics, stack)
    │   ├── services.json   # Services data
    │   ├── sitelinks.json  # External links, emails, socials, share URLs
    │   └── techStackConsole.json  # Tech stack console data
    ├── hooks/
    │   ├── useBlogSearch.js       # Blog list search + pagination + tag filtering
    │   ├── useCountUp.js          # Animated number counter
    │   ├── useHashScroll.js       # Hash fragment scroll handling
    │   ├── useLeadCaptureVisibility.js  # Email capture visibility tracking
    │   ├── useNextProjectSection.js  # Scroll-to-next-project CTA behavior
    │   ├── useNotFoundPageScene.js   # Three.js 3D scene for 404 page
    │   ├── useRAF.js              # requestAnimationFrame coordinator
    │   ├── useScrollAnimations.js # Intersection Observer + GSAP scroll-triggered animations
    │   ├── useThreeSphereBackground.js  # Three.js sphere background
    │   ├── useTimeOnPage.js       # Fires time_on_page event on unmount (≥5s threshold)
    │   ├── useWaterRipple.js      # Canvas water ripple effect
    │   └── useWeb3Form.js         # Web3Forms integration
    ├── pages/
    │   ├── home/
    │   │   ├── HomePage.jsx     # Main landing page — composes all sections
    │   │   └── sections/        # Homepage section components
    │   │       ├── HeroSection.jsx
    │   │       ├── StudioOverviewSection.jsx
    │   │       ├── ServicesSection.jsx
    │   │       ├── ProjectsSection.jsx
    │   │       ├── WorkStatsSection.jsx
    │   │       ├── TestimonialsSection.jsx
    │   │       ├── TeamSection.jsx
    │   │       ├── SocialSection.jsx
    │   │       ├── FAQSection.jsx
    │   │       ├── BlogPromoSection.jsx
    │   │       └── ContactSection.jsx
    │   ├── blog/
    │   │   ├── BlogPage.jsx      # Blog listing — search, pagination, tags
    │   │   └── BlogPostPage.jsx  # Single post — Markdown rendering, TOC, sidebar
    │   ├── AboutUsPage.jsx       # About — origin, story timeline, founders, beliefs
    │   ├── CareersPage.jsx       # Job listing — accordion, apply links
    │   ├── ContactPage.jsx       # Contact — form, direct links
    │   ├── PartnersPage.jsx      # Partners listing — filter, drawer, timeline
    │   ├── PrivacyPage.jsx
    │   ├── ProjectDetailPage.jsx # Single project — hero, metrics, solution, images
    │   ├── ProjectsPage.jsx      # Redirect to first project (not a listing page)
    │   ├── TermsPage.jsx
    │   ├── WorkingWithUsPage.jsx # How we work — fit checks, conversation steps
    │   └── NotFoundPage.jsx      # 404 with Three.js animated scene
    ├── providers/
    │   ├── LenisProvider.jsx     # Smooth scroll provider
    │   ├── LoadingProvider.jsx   # Site loading state
    │   ├── RAFProvider.jsx       # requestAnimationFrame context
    │   └── TransitionProvider.jsx# Page transition orchestrator
    ├── services/
    │   └── linksservice.js      # External link resolution, email, social, share URLs
    ├── styles/
    │   ├── base.css              # Global styles (original Webflow CSS)
    │   ├── components.css        # Shared component styles
    │   ├── home.css              # Homepage section styles
    │   ├── blog.css              # Blog listing + post page styles
    │   ├── projects.css          # Project detail page styles
    │   ├── partners.css          # Partners page styles
    │   ├── careers.css           # Careers + Working With Us styles
    │   ├── about.css             # About page styles
    │   ├── contact.css           # Contact page styles
    │   ├── legal.css             # Privacy + Terms styles
    │   ├── effects.css           # Animation effect styles
    │   ├── elfsight.css          # Third-party widget styles
    │   ├── loadingscreen.css     # Loading screen styles
    │   ├── step-progress-timeline.css  # Step progress timeline styles
    │   └── 404.css               # 404 page styles
    └── utils/
        ├── analytics.js          # Centralized GA4 tracking — all track* functions
        ├── blog/                 # Blog utilities (article helpers, markdown, sorting, highlight)
        ├── helpers.js            # General utility functions (isMobile, etc.)
        ├── lazyWithRetry.js      # Lazy loading with retry on chunk failure
        ├── structuredData.js     # JSON-LD structured data builders
        └── timeline.js           # Timeline data helpers
```

---

## 3. Architecture Patterns

### 3.1 Routing
- All routes are defined in `src/main.jsx`
- Both `/path` and `/path/` variants exist for each route
- Blog posts: `/blog/:slug/` renders `BlogPostPage` with `slug` from URL params
- Project detail: `/projects/:slug/` renders `ProjectDetailPage`
- `/projects` and `/projects/` redirect to first project via `ProjectsPage`
- 404 catch-all: `<Route path="*" element={<NotFoundPage />} />`
- Global overlays (`EmailCaptureForm`, `CookieConsent`) rendered outside `<Routes>`

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
- `TransitionProvider` in `src/providers/TransitionProvider.jsx` handles all cross-page navigation
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
`lazyWithRetry` (in `src/utils/lazyWithRetry.js`) wraps `React.lazy` with automatic retry on chunk load failure.

### 3.5 Path Aliases
Vite config defines import aliases for cleaner imports:
```js
import { Navbar } from '@components/navigation/Navbar';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { trackCTA } from '@utils/analytics';
import { getProjectBookingLink } from '@services/linksservice';
```
Available aliases: `@components`, `@hooks`, `@constants`, `@providers`, `@utils`, `@services`, `@data`, `@styles`.

### 3.6 Scroll Animations
- `useScrollAnimations.js` — main animation hook
- Uses `data-animate-scope`, `data-animate`, `data-animate-preset`, `data-animate-stagger`, etc.
- Supported presets: `fade-up`, `slide-from-left`, `slide-from-right`, `zoom-in`, `width-countup`, `overlay-reveal`, `gsap-scale`
- Sets up IntersectionObserver + GSAP `fromTo` tweens
- Cleans up inline `transform` after animation to prevent CSS hover conflicts

### 3.7 Blog System
- Posts are Markdown files in `src/blog/` with YAML frontmatter
- Naming convention: `{slug}.md` (e.g. `angular-5-to-19-migration.md`)
- Parsed at build time and runtime via `src/utils/blog/`
- Metadata cached in `window.__BLOG_POSTS_METADATA__` after first load
- Syntax highlighting via highlight.js on `BlogPostPage`
- RSS/Atom feeds auto-generated by `plugins/seo-prerender/` at build time
- Medium import: `npm run blog:import:medium` fetches from Medium feed

### 3.8 External Links Service
- `src/services/linksservice.js` centralizes all external URLs
- Reads from `src/data/sitelinks.json`
- Provides typed getters: `getProjectBookingLink()`, `getNewsletterSubscribeLink()`, `getProjectBriefFormLink()`, etc.
- Also provides email, social, and share URL builders
- Never hardcode external URLs in components — always use this service

---

## 4. Analytics

### 4.1 Centralized Tracking (`src/utils/analytics.js`)
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

### 4.2 AppLink Component (`src/components/navigation/AppLink.jsx`)
- Wraps React Router's `<Link>` with optional analytics props
- Props: `trackEvent` (string), `trackData` (object)
- Fires `trackEvent(trackEvent, trackData)` BEFORE navigation
- Does NOT automatically track every click — explicit props required
- Use for client-side navigation that needs analytics

### 4.3 useTimeOnPage Hook (`src/hooks/useTimeOnPage.js`)
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
- `PROJECTS`: 7 projects loaded from `src/data/projects.json`
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

### 6.1 Imports
- No barrel exports — import directly from component files
- Use path aliases: `import { Navbar } from '@components/navigation/Navbar'`
- Page files import their own CSS: `import '../styles/blog.css'`

### 6.2 Naming
- Components: PascalCase files, named exports preferred
- Custom hooks: camelCase, `use*` prefix
- CSS classes: kebab-case, scoped by page/component prefix (e.g. `footer-`, `pc-`, `pt-`)
- Analytics events: `snake_case`

### 6.3 CSS Scoping
- Page-specific styles: separate CSS file in `src/styles/` (e.g. `partners.css`, `blog.css`)
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
- **Web3Forms**: form submission endpoint (configured via `sitelinks.json`)
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
1. Create the page component in `src/pages/`
2. Add route in `src/main.jsx` (with and without trailing slash)
3. Lazy-load with `lazyWithRetry()` if not homepage
4. Add entry to `STATIC_PAGES` in `plugins/seo-prerender/constants.js` for prerendering + sitemap
5. Add trailing-slash redirect in `public/_redirects`
6. Add SEO metadata (title, description) in the page component

### Adding a New Blog Post
1. Create `src/blog/{slug}.md` with YAML frontmatter:
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
import { getProjectBookingLink, getMailtoLink, getCompanySocialLinks } from '@services/linksservice';

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
- Barrel exports (`src/components/index.js`, `src/hooks/index.js`) — Removed; use direct imports with aliases.

---

## 10. Key Files Reference

| File | Purpose |
|---|---|
| `src/main.jsx` | App entry — provider stack, route definitions |
| `src/utils/analytics.js` | All GA4 tracking functions |
| `src/services/linksservice.js` | External link resolution, emails, socials, share URLs |
| `src/components/navigation/AppLink.jsx` | Enhanced Link with analytics props |
| `src/providers/TransitionProvider.jsx` | Page transitions + scroll + page view tracking |
| `plugins/seo-prerender/` | Build-time SEO — prerender, sitemap, RSS, Atom |
| `plugins/seo-prerender/constants.js` | Static pages, nav links, site URL |
| `vite.config.js` | Build config — plugins, chunks, aliases, SPA fallback |
| `index.html` | HTML shell — OG tags, JSON-LD, GA4 bootstrap, font preloads |
| `src/data/projects.json` | Project data (7 projects) |
| `src/data/sitelinks.json` | All external URLs, emails, social links |
| `src/utils/blog/` | Blog frontmatter parser + metadata loader |
| `src/utils/lazyWithRetry.js` | Lazy loading with chunk retry |
| `public/_redirects` | Netlify redirect rules |
| `public/robots.txt` | Crawler directives |
| `public/llms.txt` | LLM metadata |
