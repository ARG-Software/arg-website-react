import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { replaceMetaTags, escapeHtml } from '../html-utils.js';
import { buildBlogPostStaticContent, injectStaticContent } from '../static-content.js';
import { DEFAULT_AUTHOR } from '../../../src/frontend/constants/seo.js';
import { parseBlocks } from '../../../src/frontend/utils/blog/articleContent.js';
import { buildArticleSchema } from '../../../src/frontend/utils/structuredData.js';
import { toContentDateIso } from '../../../src/frontend/utils/contentDate.js';

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
    const title = `${meta.seoTitle || meta.title || meta.slug} | ARG Software`;
    const description = meta.subtitle || '';
    const author = meta.author || DEFAULT_AUTHOR.name;
    const authorUrl = meta.authorUrl || DEFAULT_AUTHOR.url;

    let extra = '';
    const publishedIso = toContentDateIso(meta.date);
    if (publishedIso) {
      extra += `<meta property="article:published_time" content="${publishedIso}">\n  `;
    }
    const modifiedIso = toContentDateIso(meta.dateModified || meta.updated || meta.date);
    if (modifiedIso) {
      extra += `<meta property="article:modified_time" content="${modifiedIso}">\n  `;
    }
    extra += `<meta property="article:author" content="${escapeHtml(author)}">`;
    extra += `\n  <meta property="article:publisher" content="ARG Software">`;
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
      author,
      authorUrl,
      jsonLd: buildArticleSchema({ ...meta, author, authorUrl, image }),
    });

    html = injectStaticContent(html, buildBlogPostStaticContent(meta, parseBlocks(body)));

    const dir = path.join(distDir, 'blog', meta.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
