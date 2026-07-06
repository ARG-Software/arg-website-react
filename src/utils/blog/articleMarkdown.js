import { sortBlogPostsNewestFirst } from './articleSorting.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

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
    const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (imgMatch) image = imgMatch[1];
  }

  return {
    slug: meta.slug || '',
    tag: meta.tag || '',
    title: meta.title || '',
    seoTitle: meta.seoTitle || meta.title || '',
    subtitle: meta.subtitle || '',
    intro: meta.intro || '',
    date: meta.date || '',
    readTime: meta.readTime || '',
    mediumUrl: meta.mediumUrl || '',
    image,
  };
}

function normalizeHeadingText(text) {
  return text.replace(/^[-–—]\s*/, '').trim();
}

function normalizeCodeLanguage(language) {
  const normalized = (language || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'text' || normalized === 'txt') return 'plaintext';
  return normalized;
}

function parseListItem(row) {
  const match = row.match(/^\*\*(.+?)\*\*\.?\s*(.*)/s);
  return match
    ? { label: match[1].replace(/\.$/, '') + '.', text: match[2].trim() }
    : { label: '', text: row };
}

function splitIntoChunks(body) {
  const chunks = [];
  const lines = body.split('\n');
  let current = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      if (!inFence && current.length) {
        chunks.push(current.join('\n'));
        current = [];
      }
      inFence = !inFence;
      current.push(line);
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (line.trim() === '') {
      if (current.length) {
        chunks.push(current.join('\n'));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join('\n'));
  return chunks;
}

export function parseBlocks(body) {
  const blocks = [];
  let isFirstParagraph = true;

  for (const chunk of splitIntoChunks(body)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const code = trimmed.match(/^```(\w*)\r?\n([\s\S]*?)\r?\n```$/);
    if (code) {
      blocks.push({ type: 'code', lang: normalizeCodeLanguage(code[1]), text: code[2] });
      continue;
    }

    if (trimmed.startsWith('>')) {
      blocks.push({
        type: 'callout',
        text: trimmed
          .split('\n')
          .map(line => line.replace(/^>\s?/, ''))
          .join(' ')
          .trim(),
      });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', text: normalizeHeadingText(trimmed.slice(3)) });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'subheading', text: normalizeHeadingText(trimmed.slice(4)) });
      continue;
    }

    if (/^\d+\.\s+\S.+/.test(trimmed) && !trimmed.includes('\n')) {
      blocks.push({ type: 'subheading', text: trimmed.trim() });
      continue;
    }

    if (trimmed.split('\n').every(line => /^\s*\d+\.\s+/.test(line))) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^\s*\d+\.\s+/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    if (trimmed.split('\n').every(line => line.trimStart().startsWith('- '))) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^\s*-\s/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      blocks.push({ type: 'list', items });
      continue;
    }

    if (trimmed.startsWith('![')) {
      const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        blocks.push({ type: 'image', alt: match[1], src: match[2] });
        continue;
      }
    }

    const text = trimmed.replace(/\r?\n/g, ' ');
    if (isFirstParagraph) {
      blocks.push({ type: 'lead', text });
      isFirstParagraph = false;
    } else {
      blocks.push({ type: 'paragraph', text });
    }
  }

  return blocks;
}

export function parseBlogPostMarkdown(raw) {
  const { meta } = parseFrontmatter(raw);
  return {
    slug: meta.slug || '',
    tag: meta.tag || '',
    title: meta.title || '',
    subtitle: meta.subtitle || '',
    intro: meta.intro || '',
    date: meta.date || '',
    readTime: meta.readTime || '',
    mediumUrl: meta.mediumUrl || '',
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
