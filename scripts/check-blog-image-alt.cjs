const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.resolve('src/frontend/blog');
const STRICT = process.argv.includes('--strict');
const IMAGE_PATTERN = /!\[([^\]]*)\]\((\S+)(?:\s+["'][^"']*["'])?\)/g;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const WEAK_ALT_PATTERN =
  /^(?:image|photo|picture|screenshot|screen shot|diagram|chart|graph|stats|statistics|table|header|cover|blog article|article image)$/i;
const STOP_WORDS = new Set([
  'about',
  'after',
  'against',
  'and',
  'are',
  'but',
  'for',
  'from',
  'guide',
  'how',
  'into',
  'not',
  'our',
  'that',
  'the',
  'this',
  'what',
  'when',
  'where',
  'which',
  'why',
  'with',
  'without',
  'your',
]);

function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_PATTERN);
  const meta = {};
  if (!match) return meta;

  match[1].split(/\r?\n/).forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    meta[line.slice(0, colon).trim()] = line
      .slice(colon + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  });

  return meta;
}

function getTopicWords(meta) {
  return `${meta.seoTitle || ''} ${meta.title || ''} ${meta.subtitle || ''} ${meta.tag || ''} ${meta.tags || ''}`
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function getLineNumber(raw, index) {
  return raw.slice(0, index).split(/\r?\n/).length;
}

function checkPost(file) {
  const fullPath = path.join(BLOG_DIR, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const meta = parseFrontmatter(raw);
  const topicWords = getTopicWords(meta);
  const seenAlts = new Map();
  const errors = [];
  const warnings = [];

  for (const match of raw.matchAll(IMAGE_PATTERN)) {
    const alt = match[1].trim();
    const src = match[2].trim();
    const location = `${file}:${getLineNumber(raw, match.index)}`;

    if (!alt) {
      errors.push(`${location} missing alt text for ${src}`);
      continue;
    }

    if (alt.length > 120) warnings.push(`${location} alt is longer than 120 characters: "${alt}"`);
    if (WEAK_ALT_PATTERN.test(alt)) warnings.push(`${location} alt is too generic: "${alt}"`);

    const normalizedAlt = alt.toLowerCase();
    if (seenAlts.has(normalizedAlt)) {
      warnings.push(
        `${location} duplicates alt from line ${seenAlts.get(normalizedAlt)}: "${alt}"`
      );
    } else {
      seenAlts.set(normalizedAlt, getLineNumber(raw, match.index));
    }

    if (topicWords.length && !topicWords.some(word => normalizedAlt.includes(word))) {
      warnings.push(`${location} alt does not include an article topic word: "${alt}"`);
    }
  }

  return { errors, warnings };
}

const files = fs
  .readdirSync(BLOG_DIR)
  .filter(file => file.endsWith('.md'))
  .sort();

const results = files.map(checkPost);
const errors = results.flatMap(result => result.errors);
const warnings = results.flatMap(result => result.warnings);

warnings.forEach(warning => console.warn(`[blog-image-alt] warning: ${warning}`));
errors.forEach(error => console.error(`[blog-image-alt] error: ${error}`));

if (errors.length || (STRICT && warnings.length)) {
  process.exitCode = 1;
} else {
  console.log(
    `[blog-image-alt] checked ${files.length} posts; ${warnings.length} warnings, ${errors.length} errors.`
  );
}
