const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FEED_URL = process.argv[2] || 'https://medium.com/feed/@arg-software';
const BLOG_DIR = path.resolve('src/blog');
const IMAGE_ROOT = path.resolve('public/images/blog');

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

const sanitizeTitle = value =>
  stripTags(value)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeTitle = value =>
  sanitizeTitle(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
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

const getTag = (title, categories) => {
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
  if (/\b(public|private|Task<|IActionResult|ControllerBase|DbContext)\b/.test(text)) return 'csharp';
  if (/grep|npm|dotnet|#/.test(text)) return 'bash';

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
      categories: [...item.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map(category => stripTags(category[1])),
      html: decodeEntities(extract(item, 'content:encoded')),
    };
  });

const readExistingPosts = () =>
  fs
    .readdirSync(BLOG_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const fullPath = path.join(BLOG_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const title = (raw.match(/\ntitle:\s*(.+)/) || [])[1] || '';
      const order = Number((file.match(/^(\d+)-/) || [])[1] || 0);

      return { file, fullPath, raw, title: sanitizeTitle(title), order };
    });

const cleanMediumHtml = html =>
  String(html || '')
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
      'user-agent': 'Mozilla/5.0 ARG Software blog importer',
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

  return text.replace(/\n{3,}/g, '\n\n').trim();
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

const writePost = async item => {
  const title = sanitizeTitle(item.title);
  const slug = slugify(title);
  const html = cleanMediumHtml(item.html);
  const withLocalImages = await localizeImages(html, slug, title);
  const markdown = convertHtmlToMarkdown(withLocalImages);
  const excerpt = createExcerpt(markdown);
  const subtitle = createSubtitle(excerpt);
  const date = formatDate(item.pubDate);
  const tag = getTag(title, item.categories);
  const frontmatter = [
    '---',
    `seoTitle: ${escapeFrontmatter(title)}`,
    `slug: ${slug}`,
    `tag: ${tag}`,
    `title: ${escapeFrontmatter(title)}`,
    `subtitle: ${escapeFrontmatter(subtitle)}`,
    `intro: ${escapeFrontmatter(subtitle)}`,
    `date: ${date}`,
    `readTime: ${estimateReadTime(markdown)}`,
    `excerpt: ${escapeFrontmatter(excerpt)}`,
    '---',
    '',
  ].join('\n');
  const outputPath = path.join(BLOG_DIR, `999-${slug}.md`);

  fs.writeFileSync(outputPath, `${frontmatter}${markdown}\n`, 'utf8');
  return { title, slug, outputPath };
};

const parsePostDate = raw => {
  const value = (raw.match(/\ndate:\s*(.+)/) || [])[1] || '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const renumberPosts = () => {
  const posts = fs
    .readdirSync(BLOG_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const fullPath = path.join(BLOG_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const currentOrder = Number((file.match(/^(\d+)-/) || [])[1] || 0);
      const baseName = file.replace(/^\d+-/, '');

      return { file, fullPath, raw, currentOrder, baseName, date: parsePostDate(raw) };
    })
    .sort((a, b) => a.date - b.date || a.currentOrder - b.currentOrder || a.baseName.localeCompare(b.baseName));

  posts.forEach(post => {
    const tempPath = path.join(BLOG_DIR, `__tmp__${post.baseName}`);
    fs.renameSync(post.fullPath, tempPath);
    post.tempPath = tempPath;
  });

  posts.forEach((post, index) => {
    fs.renameSync(post.tempPath, path.join(BLOG_DIR, `${index + 1}-${post.baseName}`));
  });
};

(async () => {
  const xml = await fetch(FEED_URL).then(response => response.text());
  const items = parseFeed(xml);
  const existingTitles = new Set(readExistingPosts().map(post => normalizeTitle(post.title)));
  const missing = items.filter(item => !existingTitles.has(normalizeTitle(item.title)));
  const imported = [];

  for (const item of missing.reverse()) {
    imported.push(await writePost(item));
  }

  renumberPosts();
  console.log(JSON.stringify({ feed: FEED_URL, imported: imported.length, posts: imported }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
