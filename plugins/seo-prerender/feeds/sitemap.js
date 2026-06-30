import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { escapeHtml } from '../html-utils.js';

export function generateSitemap({ distDir, blogPostMetas }) {
  const sitemapUrls = [];

  sitemapUrls.push({ loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' });
  sitemapUrls.push({ loc: `${SITE_URL}/partners/`, priority: '0.8', changefreq: 'monthly' });
  sitemapUrls.push({ loc: `${SITE_URL}/careers/`, priority: '0.9', changefreq: 'weekly' });
  sitemapUrls.push({
    loc: `${SITE_URL}/working-with-us/`,
    priority: '0.8',
    changefreq: 'monthly',
  });
  sitemapUrls.push({ loc: `${SITE_URL}/blog/`, priority: '0.9', changefreq: 'weekly' });
  sitemapUrls.push({ loc: `${SITE_URL}/privacy/`, priority: '0.3', changefreq: 'yearly' });
  sitemapUrls.push({ loc: `${SITE_URL}/terms/`, priority: '0.3', changefreq: 'yearly' });
  sitemapUrls.push({ loc: `${SITE_URL}/contact/`, priority: '0.8', changefreq: 'monthly' });

  for (const meta of blogPostMetas) {
    const entry = {
      loc: `${SITE_URL}/blog/${meta.slug}/`,
      priority: '0.7',
      changefreq: 'yearly',
    };
    if (meta.date) {
      try {
        entry.lastmod = new Date(meta.date).toISOString().split('T')[0];
      } catch {
        /* invalid date — skip lastmod */
      }
    }
    sitemapUrls.push(entry);
  }

  const projectsPath = path.resolve('src/data/projects.json');
  if (fs.existsSync(projectsPath)) {
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    for (const project of projects) {
      if (project.slug) {
        sitemapUrls.push({
          loc: `${SITE_URL}/projects/${project.slug}/`,
          priority: '0.7',
          changefreq: 'monthly',
        });
      }
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    u =>
      `  <url>
    <loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  return sitemapUrls.length;
}
