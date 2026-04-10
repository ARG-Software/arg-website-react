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
    date: meta.date || '',
    readTime: meta.readTime || '',
    mediumUrl: meta.mediumUrl || '',
    excerpt: meta.excerpt || '',
    image,
  };
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
      blocks.push({ type: 'code', lang: code[1] || 'text', text: code[2] });
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
      blocks.push({ type: 'heading', text: trimmedChunk.slice(3).trim() });
      continue;
    }
    if (trimmedChunk.startsWith('### ')) {
      blocks.push({ type: 'subheading', text: trimmedChunk.slice(4).trim() });
      continue;
    }
    if (trimmedChunk.split('\n').every(line => line.trimStart().startsWith('- '))) {
      const items = trimmedChunk
        .split('\n')
        .map(line => line.replace(/^\s*-\s/, '').trim())
        .filter(Boolean)
        .map(row => {
          const match = row.match(/^\*\*(.+?)\*\*\.?\s*(.*)/s);
          return match
            ? { label: match[1].replace(/\.$/, '') + '.', text: match[2].trim() }
            : { label: '', text: row };
        });
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
  return Object.entries(mdModules)
    .map(([path, raw]) => {
      const article = parseBlogPostMarkdown(raw);
      const match = path.match(/\/(\d+)-/);
      article._order = match ? parseInt(match[1], 10) : 0;
      return article;
    })
    .filter(article => article.slug)
    .sort((articleA, articleB) => articleB._order - articleA._order);
}

export function loadBlogPostsMetadata() {
  return Object.entries(mdModules)
    .map(([path, raw]) => {
      const article = parseBlogPostMetadata(raw);
      const match = path.match(/\/(\d+)-/);
      article._order = match ? parseInt(match[1], 10) : 0;
      return article;
    })
    .filter(article => article.slug)
    .sort((articleA, articleB) => articleB._order - articleA._order);
}

export function loadBlogPostsWithContent() {
  return Object.entries(mdModules)
    .map(([path, raw]) => {
      const article = parseBlogPostWithContent(raw);
      const match = path.match(/\/(\d+)-/);
      article._order = match ? parseInt(match[1], 10) : 0;
      return article;
    })
    .filter(article => article.slug)
    .sort((articleA, articleB) => articleB._order - articleA._order);
}
