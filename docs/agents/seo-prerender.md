# SEO prerender plugin (`plugins/seo-prerender/`)

Read before changing the prerender plugin, sitemap or feeds, or adding prerendered pages. Moved from AGENTS.md.

## 5. SEO Infrastructure (`plugins/seo-prerender/`)

Custom Vite plugin that runs during `closeBundle`. Generates:

1. **51 prerendered HTML files** — one per route, with correct `<title>`, `og:*`, `twitter:*`
2. **sitemap.xml** — all URLs with priority and changefreq
3. **rss.xml** — RSS 2.0 feed of all 34 blog posts
4. **atom.xml** — Atom 1.0 feed of all 34 blog posts
5. **Crawlable nav blocks** — static `<nav>` with all site links for Ahrefs/crawlers
   - All prerendered content (crawlable `<main>` and the detail page markup) carries `data-prerendered-content` and stays hidden for visitors via a style in `index.html`, so the app's own render and animations are the first thing they see; `<noscript>` shows it without JavaScript
6. **Project detail pages** — prerendered with per-project OG tags

## Key Config
- `SITE_URL`: `https://arg.software`
- `STATIC_PAGES`: Partners, Blog, Careers, Working with Us, About Us, Contact, Privacy, Terms (8 pages)
- `PROJECTS`: 7 projects loaded from `src/frontend/data/projects.json`
- Sitemap priorities: blog `0.7`, projects `0.6`, pages `0.8`, privacy/terms `0.3`
- Feeds only generated in production builds
