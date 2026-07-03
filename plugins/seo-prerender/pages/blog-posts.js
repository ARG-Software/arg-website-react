import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { replaceMetaTags, escapeHtml } from '../html-utils.js';
import { buildArticleSchema } from '../../../src/utils/structuredData.js';

export function writeBlogPosts({ distDir, baseHtml, blogPostMetas, generated }) {
  let count = generated;
  for (const meta of blogPostMetas) {
    const body = meta._body;

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
      } catch {
        /* invalid date — skip published_time */
      }
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
      jsonLd: buildArticleSchema({ ...meta, image }),
    });

    html = injectCrawlableBlock(
      html,
      buildCrawlableBlock(meta.title || meta.slug, {
        description: meta.subtitle || '',
        extraLinks: [{ href: '/blog/', label: 'Blog' }],
      })
    );

    const dir = path.join(distDir, 'blog', meta.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
