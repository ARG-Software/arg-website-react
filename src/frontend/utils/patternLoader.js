import { parseBlocks } from './blog/articleContent.js';
import { parseFrontmatter } from './blog/articleMarkdown.js';

// Pattern pages are short, so every page is parsed up front.
const patternModules = import.meta.glob('@content/patterns/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const splitList = value =>
  (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export function loadPatterns() {
  return Object.values(patternModules)
    .map(raw => {
      const { meta, body } = parseFrontmatter(raw);
      return {
        ...meta,
        order: Number(meta.order) || 0,
        tags: splitList(meta.tags),
        relatedPosts: splitList(meta.relatedPosts),
        relatedPatterns: splitList(meta.relatedPatterns),
        content: parseBlocks(body),
      };
    })
    .filter(pattern => pattern.slug)
    .sort((a, b) => a.order - b.order);
}
