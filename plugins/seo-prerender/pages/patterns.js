import fs from 'node:fs';
import path from 'node:path';
import contentPaths from '../../../src/frontend/data/contentPaths.json' with { type: 'json' };
import { SITE_URL } from '../constants.js';
import { loadBlogPosts, parseFrontmatter } from '../blog-loader.js';
import { replaceMetaTags } from '../html-utils.js';
import { buildPatternStaticContent, injectStaticContent } from '../static-content.js';
import { parseBlocks } from '../../../src/frontend/utils/blog/articleContent.js';

export function loadPatterns() {
  const patternsDir = path.resolve(contentPaths.patterns);
  if (!fs.existsSync(patternsDir)) return [];

  return fs
    .readdirSync(patternsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => parseFrontmatter(fs.readFileSync(path.join(patternsDir, file), 'utf-8')))
    .filter(({ meta }) => meta.slug)
    .map(({ meta, body }) => ({ ...meta, blocks: parseBlocks(body.replace(/^\r?\n/, '')) }));
}

export function writePatternPages({ distDir, baseHtml, generated }) {
  const patterns = loadPatterns();
  const posts = loadBlogPosts();
  let count = generated;

  for (const pattern of patterns) {
    const patternPath = `/patterns/${pattern.slug}/`;
    let html = replaceMetaTags(baseHtml, {
      title: `${pattern.seoTitle || pattern.title} | ARG Software`,
      socialTitle: pattern.seoTitle || pattern.title,
      description: pattern.subtitle || '',
      url: `${SITE_URL}${patternPath}`,
      type: 'article',
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Patterns', path: '/patterns/' },
        { name: pattern.title, path: patternPath },
      ],
    });

    const slugsIn = field => (pattern[field] || '').split(',').map(slug => slug.trim());
    const relatedLinks = [
      ...patterns
        .filter(item => slugsIn('relatedPatterns').includes(item.slug))
        .map(item => ({ href: `/patterns/${item.slug}/`, label: item.title })),
      ...posts
        .filter(post => slugsIn('relatedPosts').includes(post.slug))
        .map(post => ({ href: `/blog/${post.slug}/`, label: post.seoTitle || post.title })),
    ];
    html = injectStaticContent(html, buildPatternStaticContent(pattern, relatedLinks));

    const dir = path.join(distDir, 'patterns', pattern.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  return count;
}
