const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BLOG_DIR = path.resolve('src/frontend/blog');
const IMAGE_ROOT = path.resolve('public/images/blog');
const ARTICLES_ROOT = path.resolve('external/articles');
const PUBLISHED_DIR = path.join(ARTICLES_ROOT, 'published');
const DRAFTS_DIR = path.join(ARTICLES_ROOT, 'drafts');
const SOURCE_ARG = process.argv[2] || '--published';
const MEDIUM_EDITOR_PAYLOAD = 'window["obvInit"](';

const GASPAR_COLLECTION = {
  collection: 'building-gaspar',
  collectionTitle: 'Building Gaspar - Anatomy of a Business AI Assistant',
};

const COLLECTION_BY_MEDIUM_ID = {
  '546eab676aef': { ...GASPAR_COLLECTION, collectionPart: 1 },
  '285c020b0daf': { ...GASPAR_COLLECTION, collectionPart: 2 },
  '10e7e6206c8e': { ...GASPAR_COLLECTION, collectionPart: 3 },
  '93a4d22ff549': { ...GASPAR_COLLECTION, collectionPart: 4 },
  '53e8ef15ae81': { ...GASPAR_COLLECTION, collectionPart: 5 },
};

const INTERNAL_BLOG_LINKS = {
  'https://arg.software/blog/we-built-an-ai-assistant-that-sells-heres-the-architecture/':
    'https://arg.software/blog/building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture/',
  'https://arg.software/blog/three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/':
    'https://arg.software/blog/building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing/',
};

const TYPO_REPLACEMENTS = [
  {
    pattern: /\bPart(\d+):/g,
    replacement: 'Part $1:',
    label: 'Formatted missing space in part label',
  },
  {
    pattern: /\benoug\b/gi,
    replacement: 'enough',
    label: 'Fixed misspelling of enough',
  },
  {
    pattern: /Minimum\s{2,}Cost/g,
    replacement: 'Minimum Cost',
    label: 'Collapsed double space in Minimum Cost',
  },
  {
    pattern: /click\[/gi,
    replacement: 'click [',
    label: 'Inserted missing space before link text',
  },
];

const typoFixes = [];

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
  stripTags(value)
    .replace(/\r/g, '')
    .trim()
    .replace(/^\n+|\n+$/g, '');

const sanitizeText = value =>
  stripTags(value)
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeMarkdownText = value =>
  stripTags(value)
    .replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '')
    .replace(/\s+/g, ' ');

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

const normalizeComparableTitle = value => normalizeTitle(value).replace(/[^a-z0-9]+/g, '');

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

const removePartPrefix = title => sanitizeTitle(title).replace(/^Part\s+\d+\s*:\s*/i, '');

const escapeFrontmatter = value =>
  String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/"/g, "'")
    .trim();

const escapeMarkdownLinkText = value =>
  sanitizeMarkdownText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .trim();

const escapeMarkdownLinkUrl = value => String(value || '').trim().replace(/\)/g, '%29');

const formatDate = value =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

const estimateReadTime = text =>
  `${Math.max(4, Math.ceil(stripTags(text).split(/\s+/).filter(Boolean).length / 210))} min read`;

const getTag = title => (title.toLowerCase().includes('ai') ? 'AI' : 'Architecture');

const getPostTags = (post, title, subtitle) => {
  const collection = COLLECTION_BY_MEDIUM_ID[post.id];
  if (collection?.collectionPart === 4) return ['AI', 'Security', 'Architecture'];
  if (collection?.collectionPart === 5) return ['AI', 'Reliability', 'Security'];
  if (collection) return ['AI', 'Architecture'];

  return [getTag(`${title} ${subtitle}`)];
};

const inferLang = hint => {
  const normalized = String(hint || '').trim().toLowerCase();
  const aliases = { ts: 'typescript', tsx: 'typescript', js: 'javascript', sh: 'bash', shell: 'bash', txt: 'text' };
  return aliases[normalized] || normalized;
};

const applyTypoFixes = (value, context) => {
  let nextValue = String(value || '');

  TYPO_REPLACEMENTS.forEach(({ pattern, replacement, label }) => {
    nextValue = nextValue.replace(pattern, match => {
      const fixed = match.replace(pattern, replacement);
      if (fixed !== match) {
        typoFixes.push({ context, label, from: match, to: fixed });
      }
      return fixed;
    });
  });

  return nextValue;
};

const unwrapMediumRedirect = url => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('medium.com') && parsed.pathname === '/r/') {
      return parsed.searchParams.get('url') || url;
    }
  } catch (_error) {
    return url;
  }

  return url;
};

const normalizeLinkUrl = url => {
  const unwrapped = unwrapMediumRedirect(decodeEntities(url).trim());
  return INTERNAL_BLOG_LINKS[unwrapped] || unwrapped;
};

const getMarkupUrl = markup => {
  const url = markup?.href || markup?.url || markup?.link || markup?.metadata?.href || '';
  const normalized = normalizeLinkUrl(url);

  if (!/^(?:https?:|mailto:)/i.test(normalized)) return '';
  return normalized;
};

const applyParagraphLinks = paragraph => {
  const text = String(paragraph?.text || '');
  const linkMarkups = (paragraph?.markups || [])
    .map(markup => ({
      start: Number(markup.start),
      end: Number(markup.end),
      url: getMarkupUrl(markup),
    }))
    .filter(markup => markup.url && Number.isFinite(markup.start) && Number.isFinite(markup.end) && markup.end > markup.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (!linkMarkups.length) return sanitizeMarkdownText(text).trim();

  let cursor = 0;
  let markdown = '';

  linkMarkups.forEach(markup => {
    if (markup.start < cursor) return;
    markdown += sanitizeMarkdownText(text.slice(cursor, markup.start));
    markdown += `[${escapeMarkdownLinkText(text.slice(markup.start, markup.end))}](${escapeMarkdownLinkUrl(markup.url)})`;
    cursor = markup.end;
  });

  markdown += sanitizeMarkdownText(text.slice(cursor));
  return markdown.replace(/\s+/g, ' ').trim();
};

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
  const match = String(value || '').match(/(?:-|\/)([0-9a-f]{12})(?=[/?#]|$)|^([0-9a-f]{12})$/i);
  return match ? match[1] || match[2] : '';
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
        meta,
        id: extractMediumId(meta.mediumUrl),
        slug: meta.slug || file.replace(/\.md$/, ''),
        title: sanitizeTitle(meta.title),
      };
    });

const getSourceDir = () => {
  if (SOURCE_ARG === '--drafts') return DRAFTS_DIR;
  if (SOURCE_ARG === '--published' || !SOURCE_ARG) return PUBLISHED_DIR;
  return path.resolve(SOURCE_ARG);
};

const findHtmlFiles = sourceDir => {
  if (!fs.existsSync(sourceDir)) return [];
  return fs
    .readdirSync(sourceDir)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(sourceDir, file))
    .sort();
};

const extractEditorPayload = html => {
  const start = html.indexOf(MEDIUM_EDITOR_PAYLOAD);
  if (start === -1) throw new Error('Missing Medium editor payload.');

  let index = start + MEDIUM_EDITOR_PAYLOAD.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) throw new Error('Could not parse Medium editor payload.');
  return JSON.parse(html.slice(start + MEDIUM_EDITOR_PAYLOAD.length, end)).value;
};

const getExportAssetsDir = htmlPath => path.join(path.dirname(htmlPath), `${path.basename(htmlPath, '.html')}_files`);

const findExportedImage = (assetsDir, imageId) => {
  if (!imageId || !fs.existsSync(assetsDir)) return '';
  const expectedFile = imageId.replace(/\*/g, '_');
  const expectedBaseName = path.parse(expectedFile).name.toLowerCase();
  const files = fs.readdirSync(assetsDir);
  return (
    files.find(file => file === expectedFile) ||
    files.find(file => file.toLowerCase() === expectedFile.toLowerCase()) ||
    files.find(file => path.parse(file).name.toLowerCase() === expectedBaseName) ||
    ''
  );
};

const cleanArticleImageDir = articleSlug => {
  const imageDir = path.join(IMAGE_ROOT, articleSlug);
  fs.rmSync(imageDir, { recursive: true, force: true });
};

const localizeMediumImage = async (paragraph, articleSlug, title, imageIndex, assetsDir) => {
  const imageId = paragraph.metadata?.id || paragraph.metadata?.imageId || '';
  const exportedFile = findExportedImage(assetsDir, imageId);
  if (!exportedFile) return '';

  const imageDir = path.join(IMAGE_ROOT, articleSlug);
  fs.mkdirSync(imageDir, { recursive: true });

  const alt = sanitizeText(paragraph.text) || title;
  const baseName = imageIndex === 1 ? `${articleSlug}-header` : `${slugify(alt) || 'image'}-${imageIndex}`;
  const fileName = `${baseName}.webp`;
  const sourcePath = path.join(assetsDir, exportedFile);
  const outputPath = path.join(imageDir, fileName);
  const publicPath = `/images/blog/${articleSlug}/${fileName}`;

  try {
    await sharp(sourcePath).webp({ quality: 86 }).toFile(outputPath);
  } catch (error) {
    console.warn(`[medium-import] Failed to process ${sourcePath}: ${error.message}`);
    fs.copyFileSync(sourcePath, outputPath);
  }

  return `![${alt}](${publicPath})`;
};

const getMarkdownBlocksFromParagraphs = async (post, articleSlug, title, htmlPath) => {
  const paragraphs = post.content?.bodyModel?.paragraphs || [];
  const assetsDir = getExportAssetsDir(htmlPath);
  const blocks = [];
  let imageIndex = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.type === 8) {
      const code = stripCode(paragraph.text);
      if (code) {
        const lang = inferLang(paragraph.metadata?.language);
        blocks.push('```' + lang + '\n' + code + '\n```');
      }
      continue;
    }

    const text = applyTypoFixes(applyParagraphLinks(paragraph), `${post.id} body`);
    if (normalizeHeading(text) === 'about the author') break;
    if (normalizeComparableTitle(text) === normalizeComparableTitle(title)) continue;

    if (paragraph.type === 4) {
      imageIndex += 1;
      const image = await localizeMediumImage(paragraph, articleSlug, title, imageIndex, assetsDir);
      if (image) blocks.push(image);
      continue;
    }

    if (!text) continue;

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

const convertPostToMarkdown = async (post, articleSlug, title, htmlPath) => {
  const blocks = await getMarkdownBlocksFromParagraphs(post, articleSlug, title, htmlPath);
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
};

const getPostUrl = post => `https://medium.com/p/${post.id}`;

const getTimestamp = post => post.firstPublishedAt || post.latestPublishedAt || post.createdAt || post.updatedAt || Date.now();

const getDateModified = post => (post.updatedAt ? formatDate(post.updatedAt) : '');

const getSlug = (post, title) => {
  const collection = COLLECTION_BY_MEDIUM_ID[post.id];
  const titleSlug = slugify(removePartPrefix(title));
  if (!collection) return slugify(title);

  return `${collection.collection}-part-${collection.collectionPart}-${titleSlug}`;
};

const buildFrontmatter = (post, slug, title, markdown) => {
  const collection = COLLECTION_BY_MEDIUM_ID[post.id];
  const subtitle = applyTypoFixes(
    sanitizeText(post.content?.subtitle || post.virtuals?.subtitle || post.previewContent2?.subtitle || ''),
    `${post.id} subtitle`
  );
  const seoTitle = applyTypoFixes(sanitizeTitle(post.seoTitle || title), `${post.id} seoTitle`);
  const tags = getPostTags(post, title, subtitle);
  const lines = [
    '---',
    `seoTitle: ${escapeFrontmatter(seoTitle)}`,
    `slug: ${slug}`,
    `tag: ${tags[0]}`,
    `tags: ${tags.join(', ')}`,
    `title: ${escapeFrontmatter(title)}`,
    `subtitle: ${escapeFrontmatter(subtitle)}`,
    `intro: ${escapeFrontmatter(subtitle)}`,
    `date: ${formatDate(getTimestamp(post))}`,
    `dateModified: ${getDateModified(post)}`,
    `readTime: ${estimateReadTime(markdown)}`,
    `mediumUrl: ${getPostUrl(post)}`,
  ];

  if (collection) {
    lines.push(`collection: ${collection.collection}`);
    lines.push(`collectionTitle: ${escapeFrontmatter(collection.collectionTitle)}`);
    lines.push(`collectionPart: ${collection.collectionPart}`);
  }

  lines.push('---', '');
  return lines.join('\n');
};

const findExistingPost = (existingPosts, post, slug, title) =>
  existingPosts.find(existing => existing.id === post.id) ||
  existingPosts.find(existing => existing.slug === slug) ||
  existingPosts.find(existing => normalizeTitle(existing.title) === normalizeTitle(title));

const writePost = async (post, htmlPath, existingPosts) => {
  const title = applyTypoFixes(sanitizeTitle(post.title), `${post.id} title`);
  const slug = getSlug(post, title);
  cleanArticleImageDir(slug);
  const markdown = await convertPostToMarkdown(post, slug, title, htmlPath);

  if (!markdown) throw new Error(`Empty markdown after conversion for ${post.id}`);

  const outputPath = path.join(BLOG_DIR, `${slug}.md`);
  const existingPost = findExistingPost(existingPosts, post, slug, title);
  if (existingPost && existingPost.fullPath !== outputPath && fs.existsSync(existingPost.fullPath)) {
    fs.unlinkSync(existingPost.fullPath);
  }

  fs.writeFileSync(outputPath, `${buildFrontmatter(post, slug, title, markdown)}${markdown}\n`, 'utf8');

  return {
    id: post.id,
    title,
    slug,
    file: path.relative(process.cwd(), outputPath),
    action: existingPost ? 'updated' : 'imported',
  };
};

const importFromLocalHtml = async sourceDir => {
  const files = findHtmlFiles(sourceDir);
  const existingPosts = readExistingPosts();
  const imported = [];
  const updated = [];
  const skipped = [];

  for (const htmlPath of files) {
    try {
      const post = extractEditorPayload(fs.readFileSync(htmlPath, 'utf8'));
      if (!post?.id) {
        skipped.push({ file: htmlPath, reason: 'missing post id' });
        continue;
      }

      const result = await writePost(post, htmlPath, existingPosts);
      if (result.action === 'updated') updated.push(result);
      else imported.push(result);
    } catch (error) {
      skipped.push({ file: path.relative(process.cwd(), htmlPath), reason: error.message });
    }
  }

  return {
    source: 'local-medium-html',
    folder: path.relative(process.cwd(), sourceDir),
    discovered: files.length,
    imported,
    updated,
    skipped,
    typoFixes: typoFixes.filter(
      (fix, index, fixes) =>
        fixes.findIndex(candidate => candidate.context === fix.context && candidate.from === fix.from && candidate.to === fix.to) === index
    ),
  };
};

(async () => {
  const sourceDir = getSourceDir();
  const result = await importFromLocalHtml(sourceDir);

  console.log(
    JSON.stringify(
      {
        ...result,
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
