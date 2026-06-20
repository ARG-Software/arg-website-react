const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_FEED_URL = 'https://medium.com/feed/@arg-software';
const MEDIUM_USER_ID = '765b171ba7b3';
const MEDIUM_JSON_PREFIX = '])}while(1);</x>';
const MEDIUM_STREAM_URL = `https://medium.com/_/api/users/${MEDIUM_USER_ID}/profile/stream`;
const STREAM_SOURCES = ['latest', 'overview'];
const BLOG_DIR = path.resolve('src/blog');
const IMAGE_ROOT = path.resolve('public/images/blog');
const SOURCE_ARG = process.argv[2] || '';

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 ARG Software blog importer',
  accept: 'application/json, text/plain, */*',
};

const decodeEntities = value =>
  String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');

const stripTags = value =>
  decodeEntities(
    String(value || '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
      .replace(/<\/?(?:strong|b|em|i|code)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const stripCode = value =>
  decodeEntities(String(value || '').replace(/<br\s*\/?\s*>/gi, '\n'))
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();

const sanitizeText = value =>
  stripTags(value)
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeTitle = value =>
  sanitizeText(value)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeTitle = value =>
  sanitizeTitle(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeading = value =>
  sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const slugify = value =>
  sanitizeTitle(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');

const escapeFrontmatter = value =>
  String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/"/g, "'")
    .trim();

const getTag = (title, categories = []) => {
  const haystack = `${title} ${categories.join(' ')}`.toLowerCase();

  if (haystack.includes('ai') || haystack.includes('artificial-intelligence') || haystack.includes('vector')) return 'AI';
  if (haystack.includes('typescript') && (haystack.includes('any') || haystack.includes('legacy'))) return 'Refactoring';
  if (haystack.includes('testing') || haystack.includes('testcontainers')) return 'Testing';
  if (haystack.includes('docker') || haystack.includes('kubernetes') || haystack.includes('message broker')) return 'DevOps';

  return 'Architecture';
};

const inferLang = code => {
  const text = code.trim();

  if (/^\{|"compilerOptions"|"rules"/.test(text)) return 'json';
  if (/\b(import|export|type|interface|function|const|let|async function)\b/.test(text)) return 'typescript';
  if (/\b(public|private|Task<|IActionResult|ControllerBase|DbContext|namespace|class)\b/.test(text)) return 'csharp';
  if (/grep|npm|dotnet|docker|kubectl|#/.test(text)) return 'bash';

  return 'text';
};

const formatDate = value =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

const estimateReadTime = text =>
  `${Math.max(4, Math.ceil(stripTags(text).split(/\s+/).filter(Boolean).length / 210))} min read`;

const extract = (item, tag) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeEntities(match[1]).trim() : '';
};

const parseFeed = xml =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
    const item = match[1];

    return {
      title: sanitizeTitle(extract(item, 'title')),
      link: stripTags(extract(item, 'link')).replace(/\?source=.*$/, ''),
      guid: stripTags(extract(item, 'guid')),
      pubDate: stripTags(extract(item, 'pubDate')),
      description: sanitizeText(extract(item, 'description')),
      categories: [...item.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map(category => stripTags(category[1])),
      html: decodeEntities(extract(item, 'content:encoded')),
    };
  });

const parseFrontmatter = raw => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  if (!match) return meta;

  match[1].split(/\r?\n/).forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    meta[line.slice(0, colon).trim()] = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  });

  return meta;
};

const extractMediumId = value => {
  const match = String(value || '').match(/(?:-|\/)([0-9a-f]{12})(?:\?|$)/i);
  return match ? match[1] : '';
};

const readExistingPosts = () =>
  fs
    .readdirSync(BLOG_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const fullPath = path.join(BLOG_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const meta = parseFrontmatter(raw);

      return {
        file,
        fullPath,
        raw,
        meta,
        id: extractMediumId(meta.mediumUrl),
        slug: meta.slug || file.replace(/\.md$/, ''),
        title: sanitizeTitle(meta.title),
      };
    });

const stripNumericFilenamePrefixes = () => {
  fs.readdirSync(BLOG_DIR)
    .filter(file => /^\d+-.*\.md$/.test(file))
    .forEach(file => {
      const targetFile = file.replace(/^\d+-/, '');
      const sourcePath = path.join(BLOG_DIR, file);
      const targetPath = path.join(BLOG_DIR, targetFile);

      if (fs.existsSync(targetPath)) {
        throw new Error(`Cannot rename ${file}; ${targetFile} already exists.`);
      }

      fs.renameSync(sourcePath, targetPath);
    });
};

const stripAuthorSectionFromMarkdown = markdown => {
  const source = String(markdown || '');
  const stripped = source.replace(/\n##\s*About\s+the\s+Author[\s\S]*$/i, '');

  return stripped === source ? source : stripped.trimEnd();
};

const cleanExistingAuthorSections = () => {
  const cleaned = [];

  readExistingPosts().forEach(post => {
    const nextRaw = stripAuthorSectionFromMarkdown(post.raw);
    if (nextRaw === post.raw) return;

    fs.writeFileSync(post.fullPath, `${nextRaw}\n`, 'utf8');
    cleaned.push(post.file);
  });

  return cleaned;
};

const cleanMediumHtml = html =>
  String(html || '')
    .replace(/<h[1-6][^>]*>\s*About\s+the\s+Author\s*<\/h[1-6]>[\s\S]*$/i, '')
    .replace(/<hr>[\s\S]*$/i, '')
    .replace(/<blockquote>[\s\S]*?Your Job Search[\s\S]*?<\/blockquote>\s*(?:<figure>[\s\S]*?<\/figure>)?/gi, '')
    .replace(/<h3>\s*Thank you for being a part of the community[\s\S]*$/i, '')
    .replace(/<img[^>]+medium\.com\/_\/stat[^>]*>/gi, '')
    .replace(/<figure>\s*<img[^>]+max\/32\/[^>]*>\s*<\/figure>/gi, '');

const getImageAttributes = img => {
  const src = (img.match(/\ssrc="([^"]+)"/) || [])[1] || '';
  const alt = (img.match(/\salt="([^"]*)"/) || [])[1] || '';

  return { src: decodeEntities(src), alt: sanitizeTitle(alt) };
};

const shouldSkipImage = src =>
  !src || /medium\.com\/_\/stat/.test(src) || /\/max\/32\//.test(src) || /\/fit\/c\/150\/150\//.test(src);

const downloadImage = async (url, outputPath) => {
  const response = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input).webp({ quality: 86 }).toFile(outputPath);
};

const localizeImages = async (html, articleSlug, title) => {
  const imageDir = path.join(IMAGE_ROOT, articleSlug);
  fs.mkdirSync(imageDir, { recursive: true });

  let index = 0;
  const downloads = [];
  const replaced = html.replace(/<figure>\s*(<img[^>]+>)\s*<\/figure>|(<img[^>]+>)/gi, (_match, figureImage, inlineImage) => {
    const attrs = getImageAttributes(figureImage || inlineImage || '');
    if (shouldSkipImage(attrs.src)) return '';

    index += 1;
    const baseName = index === 1 ? `${articleSlug}-header` : `${slugify(attrs.alt) || 'image'}-${index}`;
    const fileName = `${baseName}.webp`;
    const outputPath = path.join(imageDir, fileName);
    const publicPath = `/images/blog/${articleSlug}/${fileName}`;
    const alt = attrs.alt || title;

    downloads.push(downloadImage(attrs.src, outputPath).catch(error => console.warn(error.message)));

    return `\n\n![${alt}](${publicPath})\n\n`;
  });

  await Promise.all(downloads);
  return replaced;
};

const localizeMediumImage = async (paragraph, articleSlug, title, index) => {
  const metadata = paragraph.metadata || {};
  const imageId = metadata.id || metadata.imageId || '';
  if (!imageId) return '';
  if (metadata.originalWidth <= 64 && metadata.originalHeight <= 64) return '';

  const imageDir = path.join(IMAGE_ROOT, articleSlug);
  fs.mkdirSync(imageDir, { recursive: true });

  const alt = sanitizeText(paragraph.text) || title;
  const baseName = index === 1 ? `${articleSlug}-header` : `${slugify(alt) || 'image'}-${index}`;
  const fileName = `${baseName}.webp`;
  const outputPath = path.join(imageDir, fileName);
  const publicPath = `/images/blog/${articleSlug}/${fileName}`;
  const imageUrl = `https://miro.medium.com/v2/resize:fit:1400/${imageId}`;

  try {
    await downloadImage(imageUrl, outputPath);
  } catch (error) {
    console.warn(error.message);
  }

  return `![${alt}](${publicPath})`;
};

const convertHtmlToMarkdown = html => {
  let text = html;
  const codeBlocks = [];

  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, codeHtml) => {
    const code = stripCode(codeHtml).replace(/\n{3,}/g, '\n\n');
    const lang = inferLang(code);
    const token = `\n\n@@CODE_BLOCK_${codeBlocks.length}@@\n\n`;
    codeBlocks.push(`\`\`\`${lang}\n${code}\n\`\`\``);
    return token;
  });

  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, value) => `\n\n## ${stripTags(value)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, value) => `\n\n## ${stripTags(value)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, value) => `\n\n## ${stripTags(value)}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, value) => `\n\n### ${stripTags(value)}\n\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, value) => `\n\n> ${stripTags(value).replace(/\n+/g, ' ')}\n\n`)
    .replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _type, value) => {
      const items = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(item => `- ${stripTags(item[1]).replace(/\n+/g, ' ')}`);
      return `\n\n${items.join('\n')}\n\n`;
    })
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, value) => `\n\n${stripTags(value).replace(/\n+/g, ' ')}\n\n`)
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<\/?(?:strong|b|em|i|code)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  text = decodeEntities(text)
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  codeBlocks.forEach((block, index) => {
    text = text.replace(`@@CODE_BLOCK_${index}@@`, block);
  });

  return stripAuthorSectionFromMarkdown(text.replace(/\n{3,}/g, '\n\n').trim());
};

const createExcerpt = markdown =>
  markdown
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*/m, '')
    .split(/\n\n/)
    .find(block => block && !block.startsWith('#') && !block.startsWith('```') && !block.startsWith('>'))
    ?.replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .slice(0, 220)
    .replace(/\s+\S*$/, '') || '';

const createSubtitle = excerpt =>
  excerpt.length > 150 ? `${excerpt.slice(0, 147).replace(/\s+\S*$/, '')}...` : excerpt;

const stripMediumJsonPrefix = text => {
  if (!text.startsWith(MEDIUM_JSON_PREFIX)) return text;
  return text.slice(MEDIUM_JSON_PREFIX.length);
};

const fetchText = async (url, headers = BROWSER_HEADERS) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
};

const fetchMediumJson = async url => JSON.parse(stripMediumJsonPrefix(await fetchText(url)));

const toQueryString = params => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(','));
      return;
    }
    query.set(key, String(value));
  });

  return query.toString();
};

const collectStreamPosts = async source => {
  let next = { limit: 10, source };
  const posts = new Map();

  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchMediumJson(`${MEDIUM_STREAM_URL}?${toQueryString(next)}`);
    Object.values(data.payload?.references?.Post || {}).forEach(post => {
      if (post.inResponseToPostId) return;
      posts.set(post.id, post);
    });

    next = data.payload?.paging?.next;
    if (!next) break;
  }

  return posts;
};

const collectMediumPosts = async () => {
  const posts = new Map();

  for (const source of STREAM_SOURCES) {
    const sourcePosts = await collectStreamPosts(source);
    sourcePosts.forEach((post, id) => posts.set(id, post));
  }

  return [...posts.values()].sort((postA, postB) => postA.firstPublishedAt - postB.firstPublishedAt);
};

const fetchFullPost = async postId => {
  const data = await fetchMediumJson(`https://medium.com/p/${postId}?format=json`);
  return data.payload?.value;
};

const getPostUrl = post =>
  post.mediumUrl || post.webCanonicalUrl || post.canonicalUrl || `https://medium.com/p/${post.id}`;

const getPostCategories = post => (post.virtuals?.tags || []).map(tag => tag.name || tag.slug).filter(Boolean);

const getCuratedDescription = post =>
  [
    post.metaDescription,
    post.seoDescription,
    post.content?.subtitle,
    post.virtuals?.subtitle,
    post.previewContent2?.subtitle,
  ]
    .map(sanitizeText)
    .find(Boolean) || '';

const isPartialLockedPost = post => {
  if (!post?.isSubscriptionLocked) return false;

  const paragraphs = post.content?.bodyModel?.paragraphs || [];
  const bodyWords = paragraphs.reduce((count, paragraph) => count + sanitizeText(paragraph.text).split(/\s+/).filter(Boolean).length, 0);
  const expectedWords = post.virtuals?.wordCount || 0;

  return expectedWords > 0 && bodyWords < expectedWords * 0.7;
};

const getMarkdownBlocksFromParagraphs = async (post, articleSlug, title) => {
  const paragraphs = post.content?.bodyModel?.paragraphs || [];
  const blocks = [];
  let imageIndex = 0;

  for (const paragraph of paragraphs) {
    const text = sanitizeText(paragraph.text);
    if (normalizeHeading(text) === 'about the author') break;
    if (normalizeTitle(text) === normalizeTitle(title)) continue;

    if (paragraph.type === 4) {
      imageIndex += 1;
      const image = await localizeMediumImage(paragraph, articleSlug, title, imageIndex);
      if (image) blocks.push(image);
      continue;
    }

    if (!text) continue;

    if (paragraph.type === 8) {
      blocks.push(`\`\`\`${inferLang(text)}\n${text}\n\`\`\``);
      continue;
    }

    if (paragraph.type === 9 || paragraph.type === 10) {
      blocks.push(`- ${text}`);
      continue;
    }

    if (paragraph.type === 6 || paragraph.type === 7 || paragraph.type === 14) {
      blocks.push(`> ${text.replace(/\n+/g, ' ')}`);
      continue;
    }

    if (paragraph.type === 13) {
      blocks.push(`### ${text}`);
      continue;
    }

    if (paragraph.type === 3) {
      blocks.push(`## ${text}`);
      continue;
    }

    blocks.push(text);
  }

  return blocks;
};

const convertPostToMarkdown = async (post, articleSlug, title) => {
  const blocks = await getMarkdownBlocksFromParagraphs(post, articleSlug, title);
  return stripAuthorSectionFromMarkdown(blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim());
};

const writePost = (post, markdown, subtitle, excerpt) => {
  const title = sanitizeTitle(post.title);
  const slug = slugify(title);
  const categories = getPostCategories(post);
  const tag = getTag(title, categories);
  const frontmatter = [
    '---',
    `seoTitle: ${escapeFrontmatter(post.seoTitle || title)}`,
    `slug: ${slug}`,
    `tag: ${tag}`,
    `title: ${escapeFrontmatter(title)}`,
    `subtitle: ${escapeFrontmatter(subtitle)}`,
    `intro: ${escapeFrontmatter(subtitle)}`,
    `date: ${formatDate(post.firstPublishedAt || post.latestPublishedAt || post.createdAt)}`,
    `readTime: ${estimateReadTime(markdown)}`,
    `mediumUrl: ${getPostUrl(post)}`,
    `excerpt: ${escapeFrontmatter(excerpt)}`,
    '---',
    '',
  ].join('\n');
  const outputPath = path.join(BLOG_DIR, `${slug}.md`);

  fs.writeFileSync(outputPath, `${frontmatter}${markdown}\n`, 'utf8');
  return { title, slug, outputPath };
};

const writeRssPost = async item => {
  const title = sanitizeTitle(item.title);
  const slug = slugify(title);
  const html = cleanMediumHtml(item.html);
  const withLocalImages = await localizeImages(html, slug, title);
  const markdown = convertHtmlToMarkdown(withLocalImages);
  const excerpt = createExcerpt(markdown);
  const subtitle = item.description || createSubtitle(excerpt);
  const tag = getTag(title, item.categories);
  const frontmatter = [
    '---',
    `seoTitle: ${escapeFrontmatter(title)}`,
    `slug: ${slug}`,
    `tag: ${tag}`,
    `title: ${escapeFrontmatter(title)}`,
    `subtitle: ${escapeFrontmatter(subtitle)}`,
    `intro: ${escapeFrontmatter(subtitle)}`,
    `date: ${formatDate(item.pubDate)}`,
    `readTime: ${estimateReadTime(markdown)}`,
    `mediumUrl: ${item.link}`,
    `excerpt: ${escapeFrontmatter(excerpt)}`,
    '---',
    '',
  ].join('\n');
  const outputPath = path.join(BLOG_DIR, `${slug}.md`);

  fs.writeFileSync(outputPath, `${frontmatter}${markdown}\n`, 'utf8');
  return { title, slug, outputPath };
};

const replaceFrontmatterFields = (raw, fields) => {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return raw;

  const lines = match[1].split(/\r?\n/);
  const pending = new Map(Object.entries(fields).map(([key, value]) => [key, `${key}: ${escapeFrontmatter(value)}`]));
  const nextLines = lines.map(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return line;

    const key = line.slice(0, colon).trim();
    if (!pending.has(key)) return line;

    const nextLine = pending.get(key);
    pending.delete(key);
    return nextLine;
  });

  pending.forEach(line => nextLines.push(line));

  const nextFrontmatter = ['---', ...nextLines, '---'].join(newline);
  return `${nextFrontmatter}${raw.slice(match[0].length)}`;
};

const findExistingPost = (existingPosts, post) => {
  const postTitle = normalizeTitle(post.title);
  const postSlug = slugify(post.title);

  return existingPosts.find(existing => existing.id === post.id) ||
    existingPosts.find(existing => normalizeTitle(existing.title) === postTitle) ||
    existingPosts.find(existing => existing.slug === postSlug);
};

const refreshExistingPostMetadata = (existingPost, post) => {
  const subtitle = getCuratedDescription(post);
  if (!subtitle) return false;

  const nextRaw = replaceFrontmatterFields(existingPost.raw, {
    subtitle,
    intro: subtitle,
  });

  if (nextRaw === existingPost.raw) return false;

  fs.writeFileSync(existingPost.fullPath, nextRaw, 'utf8');
  return true;
};

const importFromMediumJson = async () => {
  const streamPosts = await collectMediumPosts();
  const existingPosts = readExistingPosts();
  const imported = [];
  const updated = [];
  const skipped = [];

  for (const streamPost of streamPosts) {
    const post = await fetchFullPost(streamPost.id);
    if (!post) {
      skipped.push({ id: streamPost.id, title: streamPost.title, reason: 'missing full post payload' });
      continue;
    }

    const existingPost = findExistingPost(existingPosts, post);
    if (existingPost) {
      if (refreshExistingPostMetadata(existingPost, post)) updated.push({ id: post.id, file: existingPost.file, title: sanitizeTitle(post.title) });
      continue;
    }

    if (isPartialLockedPost(post)) {
      skipped.push({ id: post.id, title: sanitizeTitle(post.title), reason: 'locked post only exposes partial preview content' });
      continue;
    }

    const title = sanitizeTitle(post.title);
    const slug = slugify(title);
    const markdown = await convertPostToMarkdown(post, slug, title);
    const excerpt = createExcerpt(markdown);
    const subtitle = getCuratedDescription(post) || createSubtitle(excerpt);

    if (!markdown) {
      skipped.push({ id: post.id, title, reason: 'empty markdown after conversion' });
      continue;
    }

    imported.push(writePost(post, markdown, subtitle, excerpt));
  }

  return { source: 'medium-json', discovered: streamPosts.length, imported, updated, skipped };
};

const importFromRss = async feedUrl => {
  const xml = await fetchText(feedUrl, { ...BROWSER_HEADERS, accept: 'application/rss+xml, application/xml, text/xml, */*' });
  const items = parseFeed(xml);
  const existingTitles = new Set(readExistingPosts().map(post => normalizeTitle(post.title)));
  const missing = items.filter(item => !existingTitles.has(normalizeTitle(item.title)));
  const imported = [];

  for (const item of missing.reverse()) {
    imported.push(await writeRssPost(item));
  }

  return { source: 'rss', feed: feedUrl, discovered: items.length, imported, updated: [], skipped: [] };
};

(async () => {
  stripNumericFilenamePrefixes();
  const cleanedAuthorSections = cleanExistingAuthorSections();
  const result = SOURCE_ARG.includes('/feed/') ? await importFromRss(SOURCE_ARG || DEFAULT_FEED_URL) : await importFromMediumJson();

  console.log(
    JSON.stringify(
      {
        ...result,
        cleanedAuthorSections,
        imported: result.imported.length,
        importedPosts: result.imported,
        updated: result.updated.length,
        updatedPosts: result.updated,
        skipped: result.skipped.length,
        skippedPosts: result.skipped,
      },
      null,
      2
    )
  );
})().catch(error => {
  console.error(error);
  process.exit(1);
});
