import { sortBlogPostsNewestFirst } from './articleSorting.js';
import { parseBlocks } from './articleContent.js';

export { parseBlocks } from './articleContent.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

function parseTags(meta) {
  const tags = (meta.tags || meta.tag || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 3);

  return tags.length ? tags : [];
}

export function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_PATTERN);
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

  return { meta, body: raw.slice(match[0].length).replace(/^\r?\n/, '') };
}

export function extractMetadata(meta, body) {
  let image = meta.image || '';
  if (!image) {
    const imgMatch = body.match(/!\[[^\]]*\]\((\S+)(?:\s+["'][^"']*["'])?\)/);
    if (imgMatch) image = imgMatch[1];
  }

  const tags = parseTags(meta);

  return {
    slug: meta.slug || '',
    tag: meta.tag || tags[0] || '',
    tags,
    title: meta.title || '',
    seoTitle: meta.seoTitle || meta.title || '',
    subtitle: meta.subtitle || '',
    intro: meta.intro || '',
    date: meta.date || '',
    readTime: meta.readTime || '',
    mediumUrl: meta.mediumUrl || '',
    collection: meta.collection || '',
    collectionTitle: meta.collectionTitle || '',
    collectionPart: meta.collectionPart || '',
    author: meta.author || '',
    authorUrl: meta.authorUrl || '',
    authorType: meta.authorType || '',
    authorSameAs: meta.authorSameAs || '',
    dateModified: meta.dateModified || meta.updated || '',
    image,
  };
}

export function parseBlogPostMarkdown(raw) {
  const { meta } = parseFrontmatter(raw);
  const tags = parseTags(meta);
  return {
    slug: meta.slug || '',
    tag: meta.tag || tags[0] || '',
    tags,
    title: meta.title || '',
    subtitle: meta.subtitle || '',
    intro: meta.intro || '',
    date: meta.date || '',
    readTime: meta.readTime || '',
    mediumUrl: meta.mediumUrl || '',
    collection: meta.collection || '',
    collectionTitle: meta.collectionTitle || '',
    collectionPart: meta.collectionPart || '',
    author: meta.author || '',
    authorUrl: meta.authorUrl || '',
    authorType: meta.authorType || '',
    authorSameAs: meta.authorSameAs || '',
    dateModified: meta.dateModified || meta.updated || '',
  };
}

export function parseBlogPostMetadata(raw) {
  const { meta, body } = parseFrontmatter(raw);
  return extractMetadata(meta, body);
}

export function parseBlogPostWithContent(raw) {
  const { meta, body } = parseFrontmatter(raw);
  const metadata = extractMetadata(meta, body);
  return {
    ...metadata,
    content: parseBlocks(body),
  };
}

const mdModules = import.meta.glob('../../blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export function loadBlogPosts() {
  return Object.values(mdModules)
    .map(raw => parseBlogPostMarkdown(raw))
    .filter(article => article.slug)
    .sort(sortBlogPostsNewestFirst);
}

export function loadBlogPostsMetadata() {
  return Object.values(mdModules)
    .map(raw => parseBlogPostMetadata(raw))
    .filter(article => article.slug)
    .sort(sortBlogPostsNewestFirst);
}

export function loadBlogPostsWithContent() {
  return Object.values(mdModules)
    .map(raw => parseBlogPostWithContent(raw))
    .filter(article => article.slug)
    .sort(sortBlogPostsNewestFirst);
}
