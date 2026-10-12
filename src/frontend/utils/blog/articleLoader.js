import { sortBlogPostsNewestFirst } from './articleSorting.js';
import { parseBlocks } from './articleContent.js';
import { parseFrontmatter } from './articleMarkdown.js';

// Frontmatter only, resolved at build time by plugins/blog-metadata.
const metadataModules = import.meta.glob('../../blog/*.md', {
  eager: true,
  query: '?meta',
  import: 'default',
});

// Post bodies, one chunk per post, fetched when the post is opened.
const bodyModules = import.meta.glob('../../blog/*.md', {
  query: '?raw',
  import: 'default',
});

const contentBySlug = new Map();

export function loadBlogPostsMetadata() {
  return Object.values(metadataModules)
    .filter(article => article.slug)
    .sort(sortBlogPostsNewestFirst);
}

// Suspends (throws the pending promise) until the post body has loaded.
export function readBlogPostContent(slug) {
  let entry = contentBySlug.get(slug);
  if (!entry) {
    const path = Object.keys(metadataModules).find(key => metadataModules[key].slug === slug);
    entry = {};
    entry.promise = bodyModules[path]().then(
      raw => {
        entry.content = parseBlocks(parseFrontmatter(raw).body);
      },
      error => {
        contentBySlug.delete(slug);
        entry.error = error;
      }
    );
    contentBySlug.set(slug, entry);
  }
  if (entry.error) throw entry.error;
  if (!entry.content) throw entry.promise;
  return entry.content;
}
