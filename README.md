# ARG Software

Corporate website for **ARG Software** — a Portugal-based software studio specializing in fintech, media, and high-growth tech. Architecture-first, production-ready digital platforms.

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
| **Analytics** | GA4 — centralized modular tracking |
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
    ├── services/                 # External link resolution (linksservice.js)
    ├── styles/                   # CSS files (base, components, home, blog, projects, partners, careers, etc.)
    ├── utils/                    # Analytics, blog parser, helpers, structured data, lazy retry
    └── animations/               # Animation attribute presets
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
- **sitemap.xml** — all URLs with priority and changefreq
- **rss.xml** — RSS 2.0 feed of all 34 blog posts
- **atom.xml** — Atom 1.0 feed of all 34 blog posts

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

## Deployment

The `dist/` directory is deployed to Netlify. Netlify redirects in `public/_redirects`:
- **GA4 proxy**: `/g/js` → Google Tag Manager, `/g/collect` → Google Analytics
- **LLM aliases**: `/llm.txt` → `/llms.txt`, `/full-llm.txt` → `/llms-full.txt`
- **Trailing-slash canonicalization**: all routes redirect to trailing-slash variants
- **Legacy redirects**: `/team` → `/partners/`, `/articles/:slug` → `/blog/:slug/`
- **SPA fallback**: all unmatched routes serve `404.html`

---

## For AI Agents

See **[AGENTS.md](./AGENTS.md)** for a comprehensive navigation guide covering architecture patterns, component conventions, analytics usage, build process, common tasks, and gotchas.
