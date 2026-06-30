import fs from 'node:fs';
import path from 'node:path';

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split('\n').forEach(line => {
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

export function parseBlogDate(date) {
  const timestamp = Date.parse(date || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortBlogPostsNewestFirst(a, b) {
  const dateDiff = parseBlogDate(b.date) - parseBlogDate(a.date);
  if (dateDiff) return dateDiff;
  return (a.title || a.slug || '').localeCompare(b.title || b.slug || '');
}

export function loadBlogPosts() {
  const articlesDir = path.resolve('src/blog');
  if (!fs.existsSync(articlesDir)) {
    console.warn('[seo-prerender] blog/ directory not found, skipping blog posts.');
    return [];
  }
  const mdFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
  return mdFiles
    .map(file => {
      const raw = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
      const { meta, body } = parseFrontmatter(raw);
      return meta.slug ? { ...meta, _body: body } : null;
    })
    .filter(Boolean)
    .sort(sortBlogPostsNewestFirst);
}

export function getBlogPostLinks(blogPostMetas) {
  return blogPostMetas.map(meta => ({
    href: `/blog/${meta.slug}/`,
    label: meta.seoTitle || meta.title || meta.slug,
  }));
}
