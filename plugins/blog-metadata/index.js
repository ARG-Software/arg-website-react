import fs from 'node:fs';
import { parseBlogPostMetadata } from '../../src/frontend/utils/blog/articleMarkdown.js';

const META_QUERY = '?meta';

// Serves `post.md?meta` as the post's parsed frontmatter, so list views
// (homepage, nav menu, blog listing) do not ship every post body.
export function blogMetadata() {
  return {
    name: 'blog-metadata',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith(`.md${META_QUERY}`)) return null;
      const file = id.slice(0, -META_QUERY.length);
      this.addWatchFile(file);
      const metadata = parseBlogPostMetadata(fs.readFileSync(file, 'utf-8'));
      return `export default ${JSON.stringify(metadata)};`;
    },
  };
}
