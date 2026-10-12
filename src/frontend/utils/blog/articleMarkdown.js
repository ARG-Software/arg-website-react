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
    reviewedOn: meta.reviewedOn || '',
    image,
  };
}

export function parseBlogPostMetadata(raw) {
  const { meta, body } = parseFrontmatter(raw);
  return extractMetadata(meta, body);
}
