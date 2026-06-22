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
    excerpt: meta.excerpt || '',
    image,
  };
}

export function parseBlogDate(date) {
  const timestamp = Date.parse(date || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function parseDateToIso(date) {
  const timestamp = parseBlogDate(date);
  return timestamp ? new Date(timestamp).toISOString() : '';
}

export function sortBlogPostsNewestFirst(articleA, articleB) {
  const dateDiff = parseBlogDate(articleB.date) - parseBlogDate(articleA.date);
  if (dateDiff) return dateDiff;
  return (articleA.title || articleA.slug || '').localeCompare(
    articleB.title || articleB.slug || ''
  );
}

export function getBlogTags(posts) {
  return Array.from(new Set(posts.map(article => article.tag).filter(Boolean))).sort();
}

export function getRelatedPosts(posts, sourcePost, limit = 3) {
  const related = posts.filter(
    post => post.slug !== sourcePost.slug && post.tag === sourcePost.tag
  );
  const fallback = posts.filter(
    post => post.slug !== sourcePost.slug && post.tag !== sourcePost.tag
  );

  return [...related, ...fallback].slice(0, limit);
}

export function getHeadingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeHeadingText(text) {
  return text.replace(/^[-–—]\s*/, '').trim();
}

function normalizeCodeLanguage(language) {
  const normalizedLanguage = (language || '').trim().toLowerCase();
  if (!normalizedLanguage || normalizedLanguage === 'text' || normalizedLanguage === 'txt') {
    return 'plaintext';
  }

  return normalizedLanguage;
}

function parseListItem(row) {
  const match = row.match(/^\*\*(.+?)\*\*\.?\s*(.*)/s);
  return match
    ? { label: match[1].replace(/\.$/, '') + '.', text: match[2].trim() }
    : { label: '', text: row };
}

function findNearestWordBoundary(text, targetIndex) {
  const beforeTarget = text.lastIndexOf(' ', targetIndex);
  const afterTarget = text.indexOf(' ', targetIndex);

  if (beforeTarget === -1) return afterTarget === -1 ? text.length : afterTarget;
  if (afterTarget === -1) return beforeTarget;

  return targetIndex - beforeTarget <= afterTarget - targetIndex ? beforeTarget : afterTarget;
}

export function splitArticleTitle(title) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return [''];

  const minIndex = normalizedTitle.length * 0.35;
  const maxIndex = normalizedTitle.length * 0.72;
  const targetIndex = normalizedTitle.length * 0.52;
  const candidates = [];

  for (let index = 0; index < normalizedTitle.length; index += 1) {
    const character = normalizedTitle[index];
    const nextCharacter = normalizedTitle[index + 1];

    if ('.:?!'.includes(character) && nextCharacter === ' ') {
      candidates.push(index + 1);
    }
  }

  [' - ', ' — ', ' – '].forEach(separator => {
    const index = normalizedTitle.indexOf(separator);
    if (index !== -1) candidates.push(index);
  });

  const bestPunctuationSplit = candidates
    .filter(index => index >= minIndex && index <= maxIndex)
    .sort((indexA, indexB) => Math.abs(indexA - targetIndex) - Math.abs(indexB - targetIndex))[0];

  const splitIndex = bestPunctuationSplit ?? findNearestWordBoundary(normalizedTitle, targetIndex);
  const firstLine = normalizedTitle.slice(0, splitIndex).trim();
  const secondLine = normalizedTitle
    .slice(splitIndex)
    .replace(/^[-—–]\s*/, '')
    .trim();

  return secondLine ? [firstLine, secondLine] : [normalizedTitle];
}

export function splitIntoChunks(body) {
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
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;
    const code = trimmedChunk.match(/^```(\w*)\r?\n([\s\S]*?)\r?\n```$/);
    if (code) {
      blocks.push({ type: 'code', lang: normalizeCodeLanguage(code[1]), text: code[2] });
      continue;
    }
    if (trimmedChunk.startsWith('>')) {
      blocks.push({
        type: 'callout',
        text: trimmedChunk
          .split('\n')
          .map(line => line.replace(/^>\s?/, ''))
          .join(' ')
          .trim(),
      });
      continue;
    }
    if (trimmedChunk.startsWith('## ')) {
      blocks.push({ type: 'heading', text: normalizeHeadingText(trimmedChunk.slice(3)) });
      continue;
    }
    if (trimmedChunk.startsWith('### ')) {
      blocks.push({ type: 'subheading', text: normalizeHeadingText(trimmedChunk.slice(4)) });
      continue;
    }
    if (/^\d+\.\s+\S.+/.test(trimmedChunk) && !trimmedChunk.includes('\n')) {
      blocks.push({ type: 'subheading', text: trimmedChunk.trim() });
      continue;
    }
    if (trimmedChunk.split('\n').every(line => /^\s*\d+\.\s+/.test(line))) {
      const items = trimmedChunk
        .split('\n')
        .map(line => line.replace(/^\s*\d+\.\s+/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      blocks.push({ type: 'ordered-list', items });
      continue;
    }
    if (trimmedChunk.split('\n').every(line => line.trimStart().startsWith('- '))) {
      const items = trimmedChunk
        .split('\n')
        .map(line => line.replace(/^\s*-\s/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      blocks.push({ type: 'list', items });
      continue;
    }
    if (trimmedChunk.startsWith('![')) {
      const match = trimmedChunk.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        blocks.push({ type: 'image', alt: match[1], src: match[2] });
        continue;
      }
    }
    const text = trimmedChunk.replace(/\r?\n/g, ' ');
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
    excerpt: meta.excerpt || '',
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

const mdModules = import.meta.glob('../blog/*.md', {
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
