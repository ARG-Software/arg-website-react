import fs from 'node:fs';
import path from 'node:path';
import { loadBlogPosts, getBlogPostLinks } from './blog-loader.js';
import { writeHomepage } from './pages/homepage.js';
import { writeStaticPages } from './pages/static-pages.js';
import { writeBlogPosts } from './pages/blog-posts.js';
import { writeProjectPages } from './pages/projects.js';
import { writeNotFoundPage } from './pages/not-found.js';
import { generateSitemap } from './feeds/sitemap.js';
import { generateRss, generateAtom } from './feeds/rss.js';

export default function seoPrerender() {
  return {
    name: 'vite-plugin-seo-prerender',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve('dist');
      const indexPath = path.join(distDir, 'index.html');

      if (!fs.existsSync(indexPath)) {
        console.warn('[seo-prerender] dist/index.html not found, skipping.');
        return;
      }

      const baseHtml = fs.readFileSync(indexPath, 'utf-8');

      const blogPostMetas = loadBlogPosts();
      if (blogPostMetas.length === 0) {
        console.warn('[seo-prerender] No blog posts found, skipping prerender.');
        return;
      }

      const blogPostLinks = getBlogPostLinks(blogPostMetas);

      let generated = 0;

      // Homepage
      writeHomepage({ distDir, baseHtml });

      // Static pages
      generated = writeStaticPages({ distDir, baseHtml, blogPostLinks, generated });

      // Blog post pages
      generated = writeBlogPosts({ distDir, baseHtml, blogPostMetas, generated });

      // Project detail pages
      generated = writeProjectPages({ distDir, baseHtml, generated });

      // 404 page
      generated = writeNotFoundPage({ distDir, baseHtml, generated });

      // Sitemap
      const sitemapUrlCount = generateSitemap({ distDir, blogPostMetas });

      // RSS + Atom feeds
      generateRss({ distDir, blogPostMetas });
      generateAtom({ distDir, blogPostMetas });

      console.log(
        `[seo-prerender] Generated ${generated} prerendered HTML files + sitemap.xml (${sitemapUrlCount} URLs) + rss.xml + atom.xml (${blogPostMetas.length} posts).`
      );
    },
  };
}
