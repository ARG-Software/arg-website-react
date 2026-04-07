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
  { href: '/articles/', label: 'Articles' },
  { href: '/partners/', label: 'Partners' },
  { href: '/clients/', label: 'Clients' },
  { href: '/team/', label: 'Team' },
  { href: '/#contact', label: 'Contact' },
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
  <h1>${escapeHtml(h1Text)}</h1>${descHtml}${subHtml}${paraHtml}
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
    title: 'Our Partners | Arg Software',
    h1: 'Our Partners',
    description:
      'Meet the companies and organizations Arg Software partners with to deliver exceptional digital solutions across fintech, open payments, and financial inclusion.',
    paragraphs: [
      'Arg Software partners with industry-leading organizations across fintech, open payments, music technology, and digital consultancy.',
      'Our partners include the Interledger Foundation, a global nonprofit building an open interoperable payment network enabling seamless currency-agnostic transactions for the 1.4 billion people excluded from traditional banking.',
      'We work with the Mojaloop Foundation, building open-source interoperable payment systems that bring affordable digital financial services to unbanked populations worldwide.',
      'Our technology partners include ThreeSigma, a research-driven blockchain and decentralised finance advisory firm, and SkyTracks, a cloud-based music production platform enabling real-time collaboration between musicians and audio engineers.',
      'We also partner with Angry Ventures, a hands-on venture studio that builds and scales digital products, and North Music Group, a music rights management company providing modern tools for catalogue management and royalty tracking.',
    ],
  },
  {
    path: '/clients/',
    title: 'Case Studies & Clients | Arg Software',
    h1: 'Case Studies & Clients',
    description:
      'Explore how Arg Software delivers impactful solutions across fintech, open payments, and digital platforms. Real projects, real results.',
    paragraphs: [
      'Arg Software has delivered production-ready software across fintech, music technology, and digital marketing. Our work spans 6 countries, handling 2000 transactions per second with over 1000 production deploys.',
      'For Mojaloop, we contributed to the vNext open-source financial hub, enhancing scalability, security, and modularity through microservices architecture and real-time transaction settlement for global digital payments.',
      'For Dokutar, we migrated a legacy PHP API to TypeScript, delivering a secure GDPR-compliant cloud platform for tax documentation with automated data capture and workflow automation.',
      'For SkyTracks, we helped build a cloud-based music production studio with real-time collaboration via WebRTC, virtual instruments, and an integrated digital audio workstation accessible from any browser.',
      'For Vector, we rebuilt a crypto trading platform from scratch, connecting a non-functional UI to a fully operational backend supporting exchange integrations and automated trade signals.',
      'For Royalty Flush, we partnered with North Music Group to create a music rights management platform with catalog management, automated royalty tracking, and licensing tools.',
    ],
  },
  {
    path: '/articles/',
    title: 'Articles & Insights | Arg Software',
    h1: 'Articles & Insights',
    description:
      'Technical articles, engineering insights, and best practices from the Arg Software team. Deep dives into architecture, TypeScript, .NET, DevOps, and more.',
    paragraphs: [
      'The Arg Software blog covers software engineering topics including clean architecture, TypeScript patterns, .NET development, DevOps, Kubernetes, and AI.',
      'We write practical guides on topics like enforcing clean architecture in TypeScript, CQRS without MediatR in .NET, dependency injection patterns in ASP.NET Core, and functional error handling with the Result pattern.',
      'Our DevOps articles cover running Docker natively on Windows with WSL2, local Kubernetes clusters with NestJS and PostgreSQL, and debugging microservices with Prometheus and OpenTelemetry.',
      'We also write about software engineering culture, including the art of pull requests, building scalable monorepos with Nx and NestJS, and the real impact of AI on software development teams.',
    ],
  },
  {
    path: '/team/',
    title: 'Our Team | Arg Software',
    h1: 'Our Team',
    description:
      'Meet the engineers and founders behind Arg Software. A team of experienced developers passionate about building exceptional software for fintech and SaaS.',
    paragraphs: [
      'Arg Software was founded by Jose Antunes and Rui Rocha, two software engineers with a combined 25 years of experience delivering production systems for fintech, music technology, and high-growth SaaS companies.',
      'Our team specializes in backend architecture, custom software development, cloud infrastructure, and scalable platform engineering. We work with TypeScript, .NET, Node.js, React, Angular, PostgreSQL, Kafka, Docker, and Kubernetes.',
      'Based in Funchal and Porto, Portugal, we work with clients worldwide across Europe, the Americas, and beyond, collaborating remotely with teams across time zones.',
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

      // ── Read all articles upfront so we can link to them from /articles/ ─
      const articlesDir = path.resolve('src/articles');
      if (!fs.existsSync(articlesDir)) {
        console.warn('[seo-prerender] articles/ directory not found, skipping articles.');
        return;
      }
      const mdFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
      const articleMetas = mdFiles
        .map((file) => {
          const raw = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
          const { meta, body } = parseFrontmatter(raw);
          const orderMatch = file.match(/^(\d+)-/);
          return meta.slug ? { ...meta, _body: body, _order: orderMatch ? parseInt(orderMatch[1], 10) : 0 } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b._order - a._order);

      const articleLinks = articleMetas.map((meta) => ({
        href: `/articles/${meta.slug}/`,
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
        // For the /articles/ page, inject links to every article so they aren't orphaned
        const extraLinks = page.path === '/articles/' ? articleLinks : [];
        html = injectCrawlableBlock(html, buildCrawlableBlock(page.h1, { description: page.description, paragraphs: page.paragraphs || [], extraLinks }));

        const dir = path.join(distDir, page.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      // ── Article pages ───────────────────────────────────────────────────
      for (const meta of articleMetas) {
        const body = meta._body;

        // Extract first image from body
        let image = meta.image || '';
        if (!image) {
          const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
          if (imgMatch) image = imgMatch[1];
        }

        const articleUrl = `${SITE_URL}/articles/${meta.slug}/`;
        const title = `${meta.seoTitle || meta.title || meta.slug} | Arg Software`;
        const description = meta.excerpt || meta.subtitle || '';

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
          description: meta.excerpt || '',
          subtitle: meta.subtitle || '',
          extraLinks: [{ href: '/articles/', label: 'Articles' }],
        }));

        const dir = path.join(distDir, 'articles', meta.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        generated++;
      }

      console.log(`[seo-prerender] Generated ${generated} prerendered HTML files.`);
    },
  };
}
