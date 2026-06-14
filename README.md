# ARG Software

Corporate website for **ARG Software** — a Portugal-based software studio specializing in fintech, media, and high-growth tech. Architecture-first, production-ready digital platforms.

Live at **[arg.software](https://arg.software)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + React Router 7 (SPA) |
| **Build** | Vite 5 |
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
├── vite.config.js                # Vite + plugins config
├── vite-plugin-seo-prerender.js  # Custom SEO prerender + sitemap/RSS/Atom
├── public/                       # Static assets (fonts, images, redirects)
└── src/
    ├── main.jsx                  # App entry, provider tree, route definitions
    ├── components/               # Reusable components (barrel export in index.js)
    │   ├── cards/                # ProjectItem
    │   ├── grids/                # FilterGrid, StatsGrid, Timeline
    │   ├── hero/                 # SubpageHero
    │   ├── icons/                # Logo, Mark, SocialIcons, ValueIcons
    │   ├── layout/               # CTASection, Footer, LoadingScreen, Marquee, SectionDivider
    │   ├── navigation/           # AppLink, Navbar, NavMenu, Breadcrumb
    │   ├── overlays/             # CookieConsent, Drawer, EmailCapture
    │   ├── seo/                  # SEO component (react-helmet-async wrapper)
    │   ├── tags/                 # TechStack
    │   └── widgets/              # CounterWidget, ShuffleText
    ├── pages/                    # Route pages
    │   ├── home/                 # Homepage + 11 section components
    │   ├── blog/                 # BlogPage (listing) + BlogPostPage (detail)
    │   └── ...                   # Partners, Careers, Projects, Privacy, Terms, 404
    ├── hooks/                    # Custom hooks (barrel export in index.js)
    ├── providers/                # Context providers (Loading, RAF, Lenis, Transition)
    ├── data/                     # JSON data (jobs, partners, projects)
    ├── blog/                     # 24 Markdown blog posts
    ├── styles/                   # CSS files per page/component
    ├── utils/                    # Blog parser, helpers
    └── constants/                # Shared constants
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

---

## SEO & Prerendering

The site generates **36 static HTML files** at build time via a custom Vite plugin (`vite-plugin-seo-prerender.js`), one for every route. Each prerendered page includes correct `<title>`, `og:*`, and `twitter:*` tags for social media crawlers (Discord, Facebook, X, LinkedIn, etc.).

Also auto-generated at build time:
- **sitemap.xml** — 36 URLs with priority and changefreq
- **rss.xml** — RSS 2.0 feed of all 24 blog posts
- **atom.xml** — Atom 1.0 feed of all 24 blog posts

---

## Analytics

All GA4 tracking is centralized in `src/hooks/useAnalytics.js`. Tracked events include:
- **Page views** (SPA route changes)
- **CTA clicks** (booking, typeform, portfolio)
- **Outbound link clicks** (external sites)
- **Social link clicks** (GitHub, LinkedIn, Medium)
- **Blog interactions** (search, pagination, TOC, shares, related articles)
- **Partners interactions** (filtering, drawer open, outbound)
- **Careers interactions** (job accordion, apply)
- **Navigation** (menu open/close, use cases toggle)
- **Time on page** (≥5s threshold per page)
- **Lead capture** (EmailCapture impression, dismiss, submit, success, error)
- **Cookie consent** (accept/decline)

The `AppLink` component (SPA navigation) supports optional `trackEvent`/`trackData` props for declarative click tracking.

---

## Deployment

The `dist/` directory is deployed to Netlify. Netlify redirects handled via `public/_redirects`:
- `/team` → 301 redirect to `/partners`
- SPA fallback: all routes without file extensions serve `index.html`

---

## For AI Agents

See **[AGENTS.md](./AGENTS.md)** for a comprehensive navigation guide covering architecture patterns, component conventions, analytics usage, build process, common tasks, and gotchas.
