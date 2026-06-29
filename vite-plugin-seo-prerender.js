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
  { href: '/blog/', label: 'Blog' },
  { href: '/partners/', label: 'Partners' },
  { href: '/projects/', label: 'Projects' },
  { href: '/careers/', label: 'Careers' },
  { href: '/working-with-us/', label: 'Working with Us' },
  { href: '/contact/', label: 'Contact' },
];

function buildCrawlableBlock(h1Text, { extraLinks = [], description = '', subtitle = '', paragraphs = [] } = {}) {
  const allLinks = [...NAV_LINKS, ...extraLinks];
  const navHtml = allLinks.map(l => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('\n    ');
  const descHtml = description ? `\n  <p>${escapeHtml(description)}</p>` : '';
  const subHtml = subtitle ? `\n  <p>${escapeHtml(subtitle)}</p>` : '';
  const paraHtml = paragraphs.map(p => `\n  <p>${escapeHtml(p)}</p>`).join('');
  // Real <a> tags outside noscript and outside #root so Ahrefs counts them in the link graph.
  // Visually hidden via inline style (not display:none which crawlers may skip).
  return `<div aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">
  <h2>${escapeHtml(h1Text)}</h2>${descHtml}${subHtml}${paraHtml}
  <nav>
    ${navHtml}
  </nav>
</div>`;
}

function injectCrawlableBlock(html, block) {
  return html.replace('<div id="root"></div>', `<div id="root"></div>\n${block}`);
}

// ── Static pages with their SEO metadata ────────────────────────────────────
const STATIC_PAGES = [
  {
    path: '/partners/',
    title: 'Partners | Arg Software',
    h1: 'Partners',
    description:
      'Meet the companies Arg Software has partnered with across fintech, open payments, music technology, Web3, consultancy, and industry platforms.',
    paragraphs: [
      'Arg Software partners with teams across fintech, open payments, music technology, Web3, consultancy, and industry platforms.',
      'Our partners include the Interledger Foundation, a global nonprofit building an open interoperable payment network enabling seamless currency-agnostic transactions for the 1.4 billion people excluded from traditional banking.',
      'We work with the Mojaloop Foundation, building open-source interoperable payment systems that bring affordable digital financial services to unbanked populations worldwide.',
      'Our technology partners include ThreeSigma, a research-driven blockchain and decentralised finance advisory firm, and SkyTracks, a cloud-based music production platform enabling real-time collaboration between musicians and audio engineers.',
      'We also partner with Angry Ventures, a hands-on venture studio that builds and scales digital products, and North Music Group, a music rights management company providing modern tools for catalogue management and royalty tracking.',
    ],
  },
  // {
  //   path: '/projects/',
  //   title: 'Case Studies & Projects | Arg Software',
  //   h1: 'Case Studies & Projects',
  //   description:
  //     'Explore how Arg Software delivers impactful solutions across fintech, open payments, and digital platforms. Real projects, real results.',
  //   paragraphs: [
  //     'Arg Software has delivered production-ready software across fintech, music technology, and digital marketing. Our work spans 6 countries, handling 2000 transactions per second with over 1000 production deploys.',
  //     'For Mojaloop, we contributed to the vNext open-source financial hub, enhancing scalability, security, and modularity through microservices architecture and real-time transaction settlement for global digital payments.',
  //     'For Dokutar, we migrated a legacy PHP API to TypeScript, delivering a secure GDPR-compliant cloud platform for tax documentation with automated data capture and workflow automation.',
  //     'For SkyTracks, we helped build a cloud-based music production studio with real-time collaboration via WebRTC, virtual instruments, and an integrated digital audio workstation accessible from any browser.',
  //     'For Vector, we rebuilt a crypto trading platform from scratch, connecting a non-functional UI to a fully operational backend supporting exchange integrations and automated trade signals.',
  //     'For Royalty Flush, we partnered with North Music Group to create a music rights management platform with catalog management, automated royalty tracking, and licensing tools.',
  //   ],
  // },
  {
    path: '/blog/',
    title: 'Blog & Insights | Arg Software',
    h1: 'Blog & Insights',
    description:
      'Technical articles from the Arg Software team on architecture, TypeScript, .NET, DevOps, AI tooling, and the engineering decisions behind reliable software.',
    paragraphs: [
      'The Arg Software blog covers practical software engineering: architecture, TypeScript, .NET, DevOps, AI tooling, and the tradeoffs behind reliable production systems.',
      'We write practical guides on topics like enforcing clean architecture in TypeScript, CQRS without MediatR in .NET, dependency injection patterns in ASP.NET Core, and functional error handling with the Result pattern.',
      'Our DevOps blog posts cover running Docker natively on Windows with WSL2, local Kubernetes clusters with NestJS and PostgreSQL, and debugging microservices with Prometheus and OpenTelemetry.',
      'We also write about software engineering culture, including the art of pull requests, building scalable monorepos with Nx and NestJS, and the real impact of AI on software development teams.',
    ],
  },
  {
    path: '/careers/',
    title: 'Careers | Arg Software',
    h1: 'Careers at Arg Software',
    description:
      'Arg Software is not hiring today. Learn what we look for in architecture-first engineers and how to reach the founders directly.',
    paragraphs: [
      'Arg Software is not hiring for a specific role today, but we still want to hear from engineers who think like us.',
      'We stay intentionally small and selective. The right conversations are worth having before a role exists.',
      'If you think you would fit at Arg Software, reach out directly to the founders with a short note about what you have built.',
    ],
  },
  {
    path: '/working-with-us/',
    title: 'Working with Us | Arg Software',
    h1: 'Working with Arg Software',
    description:
      'Work with Arg Software when architecture, reliability, and senior execution matter from the first technical decision to production.',
    paragraphs: [
      'Working with Arg Software means partnering with a small architecture-first engineering team that designs the system before writing it and stays close when it reaches production.',
      'We build production-ready platforms for fintech, media, open payments, music technology, and high-growth technology companies.',
      'Our process emphasizes technical planning, observable systems, clean hand-off, and senior founder involvement from first conversation to production support.',
    ],
  },
  {
    path: '/contact/',
    title: 'Contact | Arg Software',
    h1: 'Contact Arg Software',
    description:
      'Contact Arg Software with a clear project brief. Tell us what you are building, what feels risky, and where senior engineering help is needed.',
    paragraphs: [
      'Contact Arg Software to start a conversation about architecture, reliability, senior execution, or a complex software product that needs a clear technical path.',
      'Send a short brief with your name, email, company, and the context that matters. A senior engineer will review it and suggest the next useful step.',
      'Arg Software works with fintech, media, open payments, music technology, and high-growth technology teams that need production-ready systems.',
    ],
  },
  {
    path: '/privacy/',
    title: 'Privacy Policy | Arg Software',
    h1: 'Privacy Policy',
    description:
      "Arg Software's privacy policy — how we collect, use, and protect your personal data.",
    paragraphs: [
      'This privacy policy explains how Arg Software collects, uses, and protects your personal data when you visit our website or use our services.',
      'We are committed to ensuring that your privacy is protected and that we comply with applicable data protection regulations including GDPR.',
    ],
  },
  {
    path: '/terms/',
    title: 'Terms of Service | Arg Software',
    h1: 'Terms of Service',
    description:
      "Arg Software's terms of service — the conditions governing the use of our website and services.",
    paragraphs: [
      'These terms of service outline the rules and regulations for the use of Arg Software\'s website and services.',
      'By accessing this website, you accept these terms and conditions in full.',
    ],
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

function parseBlogDate(date) {
  const timestamp = Date.parse(date || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortBlogPostsNewestFirst(a, b) {
  const dateDiff = parseBlogDate(b.date) - parseBlogDate(a.date);
  if (dateDiff) return dateDiff;
  return (a.title || a.slug || '').localeCompare(b.title || b.slug || '');
}

function replaceOrInsertHeadTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', `  ${replacement}\n</head>`);
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
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${safeDesc}" />`,
  );

  // Replace canonical
  result = replaceOrInsertHeadTag(
    result,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(url)}" />`
  );

  // Replace OG tags
  result = result.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${type}" />`,
  );
  result = result.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${safeTitle}" />`,
  );
  result = result.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  result = result.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
  );
  result = result.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
  );
  result = result.replace(
    /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />`,
  );

  // Replace Twitter tags
  result = result.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  );
  result = result.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  );
  result = result.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
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

      // ── Read all blog posts upfront so we can link to them from /blog/ ─
      const articlesDir = path.resolve('src/blog');
      if (!fs.existsSync(articlesDir)) {
        console.warn('[seo-prerender] blog/ directory not found, skipping blog posts.');
        return;
      }
      const mdFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
      const blogPostMetas = mdFiles
        .map((file) => {
          const raw = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
          const { meta, body } = parseFrontmatter(raw);
          return meta.slug ? { ...meta, _body: body } : null;
        })
        .filter(Boolean)
        .sort(sortBlogPostsNewestFirst);

      const blogPostLinks = blogPostMetas.map((meta) => ({
        href: `/blog/${meta.slug}/`,
        label: meta.seoTitle || meta.title || meta.slug,
      }));

      // ── Homepage: inject H1 + nav into root index.html ──────────────────
      const homepageNoscript = buildCrawlableBlock('Building digital solutions that grow with you', {
        description: 'We build secure, scalable digital platforms for fintech, media, and high-growth tech companies. Architecture-first. Production-ready.',
        paragraphs: [
          'Arg Software is a custom software development company based in Funchal and Porto, Portugal. We design and build scalable backend systems, SaaS platforms, REST APIs, and cloud infrastructure for fintech, music technology, and high-growth tech companies worldwide.',
          'Our services include custom software development, MVP and prototype delivery, server infrastructure, backend architecture, frontend development, and AI integration. We specialize in TypeScript, .NET, Node.js, React, Angular, PostgreSQL, Kafka, Docker, and Kubernetes.',
          'We have delivered production systems across 6 countries handling 2000 transactions per second, with over 1000 deploys into production. Our clients include the Interledger Foundation, Mojaloop, SkyTracks, North Music Group, Dokutar, and TvCine.',
          'Arg Software works with startups, scale-ups, and established enterprises. We deliver focused MVPs in 6 to 16 weeks and build long-term partnerships to evolve products alongside your business.',
        ],
      });
      fs.writeFileSync(indexPath, injectCrawlableBlock(baseHtml, homepageNoscript));

      // ── Static pages ────────────────────────────────────────────────────
      for (const page of STATIC_PAGES) {
        let html = replaceMetaTags(baseHtml, {
          title: page.title,
          description: page.description,
          url: `${SITE_URL}${page.path}`,
          type: 'website',
        });
        // For the /blog/ page, inject links to every blog post so they aren't orphaned
        const extraLinks = page.path === '/blog/' ? blogPostLinks : [];
        html = injectCrawlableBlock(html, buildCrawlableBlock(page.h1, { description: page.description, paragraphs: page.paragraphs || [], extraLinks }));

        const dir = path.join(distDir, page.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      // ── Article pages ───────────────────────────────────────────────────
      for (const meta of blogPostMetas) {
        const body = meta._body;

        // Extract first image from body
        let image = meta.image || '';
        if (!image) {
          const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
          if (imgMatch) image = imgMatch[1];
        }

        const articleUrl = `${SITE_URL}/blog/${meta.slug}/`;
        const title = `${meta.seoTitle || meta.title || meta.slug} | Arg Software`;
        const description = meta.subtitle || '';

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

        html = injectCrawlableBlock(html, buildCrawlableBlock(meta.title || meta.slug, {
          description: meta.subtitle || '',
          extraLinks: [{ href: '/blog/', label: 'Blog' }],
        }));

        const dir = path.join(distDir, 'blog', meta.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      // ── Project detail pages ──────────────────────────────────────────
      const projectsDataPath = path.resolve('src/data/projects.json');
      if (fs.existsSync(projectsDataPath)) {
        const projects = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
        for (const project of projects) {
          if (!project.slug) continue;

          const projectUrl = `${SITE_URL}/projects/${project.slug}/`;
          const title = `${project.title} - Use Case | Arg Software`;
          const description = (project.intro || project.challenge || '')
            .replace(/\n+/g, ' ')
            .slice(0, 160)
            .trim();

          let html = replaceMetaTags(baseHtml, {
            title,
            description,
            url: projectUrl,
            image: project.imgSrc || '',
            type: 'website',
          });

          html = injectCrawlableBlock(html, buildCrawlableBlock(project.title || project.slug, {
            description,
            subtitle: project.subtitle || '',
            extraLinks: [{ href: '/projects/', label: 'Use Cases' }],
          }));

          const dir = path.join(distDir, 'projects', project.slug);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'index.html'), html);
          generated++;
        }
      }

      // ── 404 page ──────────────────────────────────────────────────────
      const notFoundHtml = replaceMetaTags(baseHtml, {
        title: 'Page Not Found | Arg Software',
        description: 'The page you\'re looking for doesn\'t exist. Head back to Arg Software\'s homepage.',
        url: `${SITE_URL}/`,
        type: 'website',
      });
      // Replace robots meta tag with noindex for 404 page
      const notFoundHtmlNoIndex = notFoundHtml.replace(
        /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
        '<meta name="robots" content="noindex, nofollow" />'
      );
      const notFoundCrawlable = buildCrawlableBlock('Page not found', {
        description: 'The page you\'re looking for has moved, been deleted, or never existed. Let\'s get you back on track.',
        extraLinks: NAV_LINKS,
      });
      const finalNotFoundHtml = injectCrawlableBlock(notFoundHtmlNoIndex, notFoundCrawlable);
      fs.writeFileSync(path.join(distDir, '404.html'), finalNotFoundHtml);
      generated++;

      // ── Sitemap generation ────────────────────────────────────────────
      const sitemapUrls = [];

      // Static pages
      sitemapUrls.push({ loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' });
      sitemapUrls.push({ loc: `${SITE_URL}/partners/`, priority: '0.8', changefreq: 'monthly' });
      sitemapUrls.push({ loc: `${SITE_URL}/careers/`, priority: '0.9', changefreq: 'weekly' });
      sitemapUrls.push({ loc: `${SITE_URL}/working-with-us/`, priority: '0.8', changefreq: 'monthly' });
      sitemapUrls.push({ loc: `${SITE_URL}/blog/`, priority: '0.9', changefreq: 'weekly' });
      sitemapUrls.push({ loc: `${SITE_URL}/privacy/`, priority: '0.3', changefreq: 'yearly' });
      sitemapUrls.push({ loc: `${SITE_URL}/terms/`, priority: '0.3', changefreq: 'yearly' });
      sitemapUrls.push({ loc: `${SITE_URL}/contact/`, priority: '0.8', changefreq: 'monthly' });

      // Blog posts
      for (const meta of blogPostMetas) {
        const entry = { loc: `${SITE_URL}/blog/${meta.slug}/`, priority: '0.7', changefreq: 'yearly' };
        if (meta.date) {
          try {
            entry.lastmod = new Date(meta.date).toISOString().split('T')[0];
          } catch {}
        }
        sitemapUrls.push(entry);
      }

      // Project detail pages
      const projectsPath = path.resolve('src/data/projects.json');
      if (fs.existsSync(projectsPath)) {
        const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
        for (const project of projects) {
          if (project.slug) {
            sitemapUrls.push({ loc: `${SITE_URL}/projects/${project.slug}/`, priority: '0.7', changefreq: 'monthly' });
          }
        }
      }

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);

      // ── RSS 2.0 feed ──────────────────────────────────────────────────
      const rssItems = blogPostMetas.map(meta => {
        const itemUrl = `${SITE_URL}/blog/${meta.slug}/`;
        const pubDate = meta.date ? new Date(meta.date).toUTCString() : new Date().toUTCString();
        const desc = escapeHtml(meta.subtitle || '');
        const title = escapeHtml(meta.seoTitle || meta.title || meta.slug);
        return `    <item>
      <title>${title}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
      }).join('\n');

      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Arg Software Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Technical articles, engineering insights, and best practices from the Arg Software team.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

      fs.writeFileSync(path.join(distDir, 'rss.xml'), rssXml);

      // ── Atom 1.0 feed ─────────────────────────────────────────────────
      const atomEntries = blogPostMetas.map(meta => {
        const itemUrl = `${SITE_URL}/blog/${meta.slug}/`;
        const updated = meta.date ? new Date(meta.date).toISOString() : new Date().toISOString();
        const summary = escapeHtml(meta.subtitle || '');
        const title = escapeHtml(meta.seoTitle || meta.title || meta.slug);
        return `  <entry>
    <title>${title}</title>
    <link href="${itemUrl}" />
    <id>${itemUrl}</id>
    <updated>${updated}</updated>
    <summary>${summary}</summary>
  </entry>`;
      }).join('\n');

      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Arg Software Blog</title>
  <link href="${SITE_URL}/blog/" />
  <link href="${SITE_URL}/atom.xml" rel="self" type="application/atom+xml" />
  <updated>${new Date().toISOString()}</updated>
  <id>${SITE_URL}/blog/</id>
  <author>
    <name>Arg Software</name>
  </author>
${atomEntries}
</feed>`;

      fs.writeFileSync(path.join(distDir, 'atom.xml'), atomXml);

      console.log(`[seo-prerender] Generated ${generated} prerendered HTML files + sitemap.xml (${sitemapUrls.length} URLs) + rss.xml + atom.xml (${blogPostMetas.length} posts).`);
    },
  };
}
