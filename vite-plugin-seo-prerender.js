import fs from 'node:fs';
import path from 'node:path';

/**
 * Vite plugin that generates per-route HTML files at build time
 * with correct OG meta tags for social media crawlers.
 *
 * Crawlers (Facebook, Discord, Slack, LinkedIn, X) don't execute JavaScript.
 * They only read the static HTML. This plugin ensures each route has its own
 * index.html with the right <title>, og:*, and twitter:* tags.
 */

const SITE_URL = 'https://arg.software';

// ── Site-wide nav links injected into every noscript block ──────────────────
const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#cases', label: 'Our Work' },
  { href: '/articles', label: 'Articles' },
  { href: '/partners', label: 'Partners' },
  { href: '/clients', label: 'Clients' },
  { href: '/#contact', label: 'Contact' },
];

function buildNoscript(h1Text, { extraLinks = [], description = '', subtitle = '' } = {}) {
  const navHtml = NAV_LINKS.map(l => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('\n    ');
  const extraHtml = extraLinks.map(l => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('\n    ');
  const descHtml = description ? `\n  <p>${escapeHtml(description)}</p>` : '';
  const subHtml = subtitle ? `\n  <p>${escapeHtml(subtitle)}</p>` : '';
  return `<noscript>
  <h1>${escapeHtml(h1Text)}</h1>${descHtml}${subHtml}
  <nav>
    ${navHtml}
    ${extraHtml}
  </nav>
</noscript>`;
}

function injectNoscript(html, noscript) {
  return html.replace('<div id="root"></div>', `<div id="root"></div>\n${noscript}`);
}

// ── Static pages with their SEO metadata ────────────────────────────────────
const STATIC_PAGES = [
  {
    path: '/partners',
    title: 'Our Partners | Arg Software',
    h1: 'Our Partners',
    description:
      'Meet the companies and organizations Arg Software partners with to deliver exceptional digital solutions across fintech, open payments, and financial inclusion.',
  },
  {
    path: '/clients',
    title: 'Case Studies & Clients | Arg Software',
    h1: 'Case Studies & Clients',
    description:
      'Explore how Arg Software delivers impactful solutions across fintech, open payments, and digital platforms. Real projects, real results.',
  },
  {
    path: '/articles',
    title: 'Articles & Insights | Arg Software',
    h1: 'Articles & Insights',
    description:
      'Technical articles, engineering insights, and best practices from the Arg Software team. Deep dives into architecture, TypeScript, .NET, DevOps, and more.',
  },
  {
    path: '/team',
    title: 'Our Team | Arg Software',
    h1: 'Our Team',
    description:
      'Meet the engineers and founders behind Arg Software. A team of experienced developers passionate about building exceptional software for fintech and SaaS.',
  },
];

// ── Frontmatter parser (same logic as the runtime one) ──────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split('\n').forEach((line) => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    meta[key] = value;
  });
  return { meta, body: raw.slice(match[0].length) };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Replace the OG / Twitter / title / description / canonical meta tags
 * in the built index.html with page-specific values.
 */
function replaceMetaTags(html, { title, description, url, image, type = 'website', extra = '' }) {
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
    : `${SITE_URL}/images/og.jpg`;

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);

  let result = html;

  // Replace <title>
  result = result.replace(
    /<title>[^<]*<\/title>/,
    `<title>${safeTitle}</title>`,
  );

  // Replace meta description
  result = result.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${safeDesc}">`,
  );

  // Replace canonical
  result = result.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
  );

  // Replace OG tags
  result = result.replace(
    /<meta property="og:type" content="[^"]*">/,
    `<meta property="og:type" content="${type}">`,
  );
  result = result.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${safeTitle}">`,
  );
  result = result.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${safeDesc}">`,
  );
  result = result.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
  );
  result = result.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}">`,
  );
  result = result.replace(
    /<meta property="og:image:secure_url" content="[^"]*">/,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">`,
  );

  // Replace Twitter tags
  result = result.replace(
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${safeTitle}">`,
  );
  result = result.replace(
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${safeDesc}">`,
  );
  result = result.replace(
    /<meta name="twitter:image" content="[^"]*">/,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`,
  );

  // Insert extra tags (e.g. article:published_time) before </head>
  if (extra) {
    result = result.replace('</head>', `  ${extra}\n</head>`);
  }

  return result;
}

export default function seoPrerender() {
  return {
    name: 'vite-plugin-seo-prerender',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve('dist');
      const indexPath = path.join(distDir, 'index.html');

      if (!fs.existsSync(indexPath)) {
        console.warn('[seo-prerender] dist/index.html not found, skipping.');
        return;
      }

      const baseHtml = fs.readFileSync(indexPath, 'utf-8');
      let generated = 0;

      // ── Homepage: inject H1 + nav into root index.html ──────────────────
      const homepageNoscript = buildNoscript('Building digital solutions that grow with you', {
        description: 'We build secure, scalable digital platforms for fintech, media, and high-growth tech companies. Architecture-first. Production-ready. Custom software development, SaaS platforms, backend systems, and cloud infrastructure.',
      });
      fs.writeFileSync(indexPath, injectNoscript(baseHtml, homepageNoscript));

      // ── Static pages ────────────────────────────────────────────────────
      for (const page of STATIC_PAGES) {
        let html = replaceMetaTags(baseHtml, {
          title: page.title,
          description: page.description,
          url: `${SITE_URL}${page.path}`,
          type: 'website',
        });
        html = injectNoscript(html, buildNoscript(page.h1, { description: page.description }));

        const dir = path.join(distDir, page.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      // ── Article pages ───────────────────────────────────────────────────
      const articlesDir = path.resolve('src/articles');
      if (!fs.existsSync(articlesDir)) {
        console.warn('[seo-prerender] articles/ directory not found, skipping articles.');
        return;
      }

      const mdFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const raw = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
        const { meta, body } = parseFrontmatter(raw);

        if (!meta.slug) continue;

        // Extract first image from body
        let image = meta.image || '';
        if (!image) {
          const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
          if (imgMatch) image = imgMatch[1];
        }

        const articleUrl = `${SITE_URL}/articles/${meta.slug}`;
        const title = `${meta.seoTitle || meta.title || meta.slug} | Arg Software`;
        const description = meta.excerpt || meta.subtitle || '';

        // Build extra article meta tags
        let extra = '';
        if (meta.date) {
          try {
            const iso = new Date(meta.date).toISOString();
            extra += `<meta property="article:published_time" content="${iso}">\n  `;
          } catch {}
        }
        extra += `<meta property="article:author" content="Arg Software">`;
        if (meta.tag) {
          extra += `\n  <meta property="article:section" content="${escapeHtml(meta.tag)}">`;
        }

        let html = replaceMetaTags(baseHtml, {
          title,
          description,
          url: articleUrl,
          image,
          type: 'article',
          extra,
        });

        // Inject H1 + excerpt + subtitle + nav into noscript
        const articleNoscript = buildNoscript(meta.title || meta.slug, {
          description: meta.excerpt || '',
          subtitle: meta.subtitle || '',
          extraLinks: [{ href: '/articles', label: 'Articles' }],
        });
        html = injectNoscript(html, articleNoscript);

        const dir = path.join(distDir, 'articles', meta.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      console.log(`[seo-prerender] Generated ${generated} prerendered HTML files.`);
    },
  };
}
