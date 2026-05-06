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
| **Stack** | React 18, React Router 7, Vite 5, GSAP 3, Three.js, Lenis, vanilla CSS |
| **Routing** | `react-router-dom` with both `/path` and `/path/` variants |
| **SEO** | Custom Vite plugin prerenders 36 HTML files + generates sitemap/RSS/Atom |
| **Styling** | Plain CSS files (no CSS-in-JS, no Tailwind) — organized by page/component |
| **Analytics** | GA4 via gtag — all tracking centralized in `useAnalytics.js` |
| **Build** | `npm run build` → lint:fix → Vite → prerender → image optimization |
| **Lint** | ESLint 9 with React + React Hooks + Prettier plugins |
| **Test** | No automated test suite currently configured |

---

## 2. Directory Structure

```
├── index.html              # HTML shell — OG meta, JSON-LD, GA4 bootstrap, font preloads
├── vite.config.js          # Vite config — plugins, manualChunks, SPA fallback
├── vite-plugin-seo-prerender.js  # Custom build plugin — 36 prerendered pages + sitemap/RSS/Atom
├── package.json            # Dependencies & scripts
├── public/                 # Static assets served as-is
│   ├── _redirects          # Netlify redirects (e.g. /team → 301 /)
│   ├── _headers            # Netlify headers
│   ├── files/              # PDFs (portfolio.pdf)
│   ├── fonts/              # Neue Montreal WOFF fonts
│   ├── images/             # Blog images, partners, projects, homepage, og.jpg
│   └── mobile/             # PWA icons
└── src/
    ├── main.jsx            # React entry — providers shell, route table, lazy imports
    ├── animations/         # GSAP animation helpers
    ├── blog/               # 24 Markdown blog posts with YAML frontmatter
    ├── components/
    │   ├── index.js        # Barrel export for all reusable components
    │   ├── cards/          # ProjectItem
    │   ├── grids/          # FilterGrid, StatsGrid, Timeline
    │   ├── hero/           # SubpageHero
    │   ├── icons/          # Logo, Mark, MarkName, SocialIcons, ValueIcons
    │   ├── layout/         # CTASection, Footer, LoadingScreen, Marquee, SectionDivider
    │   ├── navigation/     # AppLink, Breadcrumb, Navbar, NavMenu
    │   ├── overlays/       # CookieConsent, Drawer, EmailCapture
    │   ├── placeholders/   # PlaceholderVisual
    │   ├── rows/           # PartnerRow
    │   ├── seo/            # SEO (react-helmet-async wrapper)
    │   ├── tags/           # TechStack
    │   └── widgets/        # CounterWidget, ShuffleText
    ├── constants/          # Shared constants (e.g. PAGE_TRANSITION_DURATION_MS)
    ├── data/               # JSON data files
    │   ├── jobs.json       # Open job listings
    │   ├── partners.json   # Partners/clients with timeline data
    │   └── projects.json   # 6 project detail entries (slug, images, metrics, stack)
    ├── hooks/
    │   ├── index.js        # Barrel export for all hooks
    │   ├── useAnalytics.js # Centralized GA4 tracking — all track* functions
    │   ├── useTimeOnPage.js# Hook — fires time_on_page event on unmount (≥5s threshold)
    │   ├── useScrollAnimations.js  # Intersection Observer + GSAP scroll-triggered animations
    │   ├── useLenis.js      # Smooth scroll integration
    │   ├── useRAF.js        # requestAnimationFrame coordinator
    │   ├── usePageTransition.js    # Page exit/enter transition logic
    │   ├── useNextProjectSection.js# Scroll-to-next-project CTA behavior
    │   ├── useBlogSearch.js # Blog list search + pagination + tag filtering
    │   ├── useCountUp.js    # Animated number counter
    │   ├── useNotFoundPageScene.js  # Three.js 3D scene for 404 page
    │   ├── useThreeSphereBackground.js  # Three.js sphere background
    │   ├── useWaterRipple.js    # Canvas water ripple effect
    │   └── useCinematicZoomBlur.js  # Image zoom/blur effect
    ├── pages/
    │   ├── home/
    │   │   ├── HomePage.jsx     # Main landing page — composes all sections
    │   │   └── sections/        # Homepage section components
    │   │       ├── HeroSection.jsx
    │   │       ├── AboutSection.jsx
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
    │   ├── PartnersPage.jsx      # Partners listing — filter, drawer, timeline
    │   ├── CareersPage.jsx       # Job listing — accordion, apply links
    │   ├── ProjectDetailPage.jsx # Single project — hero, metrics, solution, images
    │   ├── ProjectsPage.jsx      # Redirect to first project (not a listing page)
    │   ├── PrivacyPage.jsx
    │   ├── TermsPage.jsx
    │   ├── NotFoundPage.jsx      # 404 with Three.js animated scene
    │   └── TeamPage.jsx          # DEPRECATED — 301 redirected via _redirects
    ├── providers/
    │   ├── LenisProvider.jsx     # Smooth scroll provider
    │   ├── LoadingProvider.jsx   # Site loading state
    │   ├── RAFProvider.jsx       # requestAnimationFrame context
    │   └── TransitionProvider.jsx# Page transition orchestrator
    ├── styles/
    │   ├── base.css              # Global styles (3947 lines — original Webflow CSS)
    │   ├── components.css         # Shared component styles
    │   ├── blog.css
    │   ├── projects.css
    │   ├── partners.css
    │   ├── careers.css
    │   ├── team.css
    │   ├── loadingscreen.css
    │   └── 404.css
    └── utils/
        ├── blog.js               # Frontmatter parser, chunk splitter, metadata loader
        └── helpers.js            # General utility functions
```

---

## 3. Architecture Patterns

### 3.1 Routing
- All routes are defined in `src/main.jsx:42-61`
- Both `/path` and `/path/` variants exist for each route
- Blog posts: `/blog/:slug/` renders `BlogPostPage` with `slug` from URL params
- Project detail: `/projects/:slug/` renders `ProjectDetailPage`
- `/projects` and `/projects/` redirect to first project via `ProjectsPage`
- 404 catch-all: `<Route path="*" element={<NotFoundPage />} />`

### 3.2 Provider Stack (innermost → outermost)
```
LoadingProvider → HelmetProvider → BrowserRouter →
  RAFProvider → LenisProvider → TransitionProvider →
    <Routes>
```
- `LoadingProvider`: global loading state
- `HelmetProvider`: `<head>` tag management per page
- `RAFProvider`: shared requestAnimationFrame loop
- `LenisProvider`: smooth scrolling
- `TransitionProvider`: page-to-page transition animations + `trackPageView`

### 3.3 Page Transitions
- `TransitionProvider` in `src/providers/TransitionProvider.jsx` handles all cross-page navigation
- Uses a horizontal/vertical overlay animation via GSAP
- Automatically calls `trackPageView()` on every SPA route change
- Calls `window.scrollTo(0, 0)` or custom Lenis scroll on navigation
- Exports `scrollToPage()` function via context for programmatic scroll

### 3.4 Lazy Loading
All pages except `HomePage` are lazy-loaded via `React.lazy()` in `main.jsx`:
```js
const PartnersPage = lazy(() => import('./pages/PartnersPage.jsx'));
const BlogPage = lazy(() => import('./pages/blog/BlogPage.jsx'));
// ... etc
```

### 3.5 Scroll Animations
- `useScrollAnimations.js` — main animation hook
- Uses `data-animate-scope`, `data-animate`, `data-animate-preset`, `data-animate-stagger`, etc.
- Supported presets: `fade-up`, `slide-from-left`, `slide-from-right`, `zoom-in`
- Sets up IntersectionObserver + GSAP `fromTo` tweens
- Cleans up inline `transform` after animation to prevent CSS hover conflicts

### 3.6 Blog System
- Posts are Markdown files in `src/blog/` with YAML frontmatter
- Naming convention: `{number}-{slug}.md` (e.g. `1-angular-5-to-19-migration.md`)
- Parsed at build time and runtime via `src/utils/blog.js`
- Metadata cached in `window.__BLOG_POSTS_METADATA__` after first load
- Syntax highlighting via highlight.js on `BlogPostPage`
- RSS/Atom feeds auto-generated by `vite-plugin-seo-prerender.js` at build time

---

## 4. Analytics

### 4.1 Centralized Tracking (`src/hooks/useAnalytics.js`)
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

## 5. SEO Infrastructure (`vite-plugin-seo-prerender.js`)

Custom Vite plugin that runs during `closeBundle`. Generates:

1. **36 prerendered HTML files** — one per route, with correct `<title>`, `og:*`, `twitter:*`
2. **sitemap.xml** — 36 URLs with priority and changefreq
3. **rss.xml** — RSS 2.0 feed of all 24 blog posts
4. **atom.xml** — Atom 1.0 feed of all 24 blog posts
5. **Crawlable nav blocks** — static `<nav>` with all site links for Ahrefs/crawlers
6. **Project detail pages** — prerendered with per-project OG tags

### Key Config
- `SITE_URL`: `https://arg.software`
- `STATIC_PAGES`: Partners, Careers, Projects, Blog, Privacy, Terms, 404
- `PROJECTS`: 6 projects loaded from `src/data/projects.json`
- Sitemap priorities: blog `0.7`, projects `0.6`, pages `0.8`, privacy/terms `0.3`
- Feeds only generated in production builds

---

## 6. Component Conventions

### 6.1 Barrel Exports
- `src/components/index.js` exports all reusable components
- `src/hooks/index.js` exports all hooks
- Always use these barrel imports in page files

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
  - `footer-*` = Footer
  - `nav_*` = Navigation overlay
  - `section_*` = Layout sections

---

## 7. External Dependencies & Config

### 7.1 npm Packages
- `react` + `react-dom` 18.2 — UI framework
- `react-router-dom` 7.13 — SPA routing
- `react-helmet-async` 3.0 — `<head>` tag management
- `gsap` 3.14 — Scroll + page transition animations
- `lenis` 1.3 — Smooth scrolling
- `three` 0.183 — 3D scenes (404 page, sphere background)
- `highlight.js` 11.11 — Blog code syntax highlighting

### 7.2 External Services
- **GA4**: `G-79TG4N6C2W` — loaded dynamically (skipped on localhost)
- **Typeform**: `https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC` — contact form
- **Zcal**: `https://zcal.co/argsoftware/project` — meeting booking
- **Social**: GitHub, LinkedIn, Medium profiles

### 7.3 Build Plugins
- `@vitejs/plugin-react` — JSX transform
- `vite-plugin-image-optimizer` — auto JPEG/PNG/WebP optimization (~61% savings)
- `vite-plugin-seo-prerender.js` — custom prerender + sitemap + feeds
- `vite-plugin-purgecss` — CSS purge
- `eslint` 9 + react + hooks + prettier plugins

### 7.4 Vite Config (`vite.config.js`)
- Dev server: port 3000, auto-open browser
- Manual chunks: `vendor` (React), `three`, `hljs`
- SPA fallback middleware for dev server
- CSS preload injection plugin
- Production: drops `console` and `debugger` statements

---

## 8. Build Process

```
npm run build
  → eslint src --ext .js,.jsx --fix   (lint + auto-fix)
  → vite build                         (bundle + minify)
    → vite-plugin-image-optimizer      (optimize images ~61% savings)
    → vite-plugin-purgecss             (purge unused CSS)
    → vite-plugin-seo-prerender        (generate 36 HTML files + sitemap + RSS + Atom)
    → preload-css plugin               (inject CSS <link rel="preload">)
```

Build output: `dist/` directory ready for deployment.

---

## 9. Common Tasks & Gotchas

### Adding a New Page
1. Create the page component in `src/pages/`
2. Add route in `src/main.jsx` (with and without trailing slash)
3. Lazy-load if not homepage
4. Add entry to `STATIC_PAGES` in `vite-plugin-seo-prerender.js` for prerendering + sitemap
5. Add SEO metadata (title, description) in the page component

### Adding a New Blog Post
1. Create `src/blog/{number}-{slug}.md` with YAML frontmatter:
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
2. Number the file to follow descending order (newest = highest number)
3. Rebuild — sitemap, RSS, and Atom are auto-generated

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
  href="https://zcal.co/argsoftware/project"
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => trackCTA('book_meeting', 'navbar')}
>
  Book a Meeting
</a>
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
- Presets: `fade-up`, `slide-from-left`, `slide-from-right`, `zoom-in`
- Stagger: `data-animate-default-stagger="100"` on scope parent
- Order override: `data-animate-order="2"` on individual elements
- Components like `FilterGrid`, `Timeline` accept optional `animate`/`preset`/`stagger` props

### When to Use AppLink vs Plain `<a>`
- **AppLink**: Internal SPA navigation (client-side routing, no full reload)
- **Plain `<a>`**: External URLs, mailto links, page anchors (`#section`)

### Deprecated Code
- `TeamPage.jsx` — 301 redirected to `/` via `public/_redirects`. Do not add new features.
- `App.jsx` — Removed; routing is now in `main.jsx` directly.

---

## 10. Key Files Reference

| File | Purpose |
|---|---|
| `src/main.jsx` | App entry — provider stack, route definitions |
| `src/hooks/useAnalytics.js` | All GA4 tracking functions |
| `src/components/navigation/AppLink.jsx` | Enhanced Link with analytics props |
| `src/providers/TransitionProvider.jsx` | Page transitions + scroll + page view tracking |
| `vite-plugin-seo-prerender.js` | Build-time SEO — prerender, sitemap, RSS, Atom |
| `vite.config.js` | Build config — plugins, chunks, SPA fallback |
| `index.html` | HTML shell — OG tags, JSON-LD, GA4 bootstrap, font preloads |
| `src/data/projects.json` | Project data (6 projects) |
| `src/utils/blog.js` | Blog frontmatter parser + metadata loader |
| `src/components/index.js` | Component barrel exports |
| `src/hooks/index.js` | Hook barrel exports |
| `public/_redirects` | Netlify redirect rules |
| `public/robots.txt` | Crawler directives |
