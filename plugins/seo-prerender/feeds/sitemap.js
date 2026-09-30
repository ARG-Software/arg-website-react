import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, STATIC_PAGES } from '../constants.js';
import { escapeHtml } from '../html-utils.js';
import { toContentDateOnly } from '../../../src/frontend/utils/contentDate.js';

export function generateSitemap({ distDir, blogPostMetas }) {
  const sitemapUrls = [];

  sitemapUrls.push({ loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' });
  for (const page of STATIC_PAGES) {
    sitemapUrls.push({
      loc: `${SITE_URL}${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
    });
  }

  for (const meta of blogPostMetas) {
    const entry = {
      loc: `${SITE_URL}/blog/${meta.slug}/`,
      priority: '0.7',
      changefreq: 'yearly',
    };
    entry.lastmod = toContentDateOnly(meta.dateModified || meta.updated || meta.date);
    sitemapUrls.push(entry);
  }

  const skillsPath = path.resolve('src/frontend/data/skills.json');
  if (fs.existsSync(skillsPath)) {
    const { skills = [] } = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));
    for (const skill of skills) {
      if (skill.slug) {
        sitemapUrls.push({
          loc: `${SITE_URL}/skills/${skill.slug}/`,
          priority: '0.6',
          changefreq: 'monthly',
        });
      }
    }
  }

  const projectsPath = path.resolve('src/frontend/data/projects.json');
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
