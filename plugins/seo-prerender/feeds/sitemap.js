import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, STATIC_PAGES } from '../constants.js';
import { escapeHtml } from '../html-utils.js';
import { toContentDateOnly } from '../../../src/frontend/utils/contentDate.js';
import { loadPatterns } from '../pages/patterns.js';

// Page videos, listed with the video sitemap extension so Google can discover them.
function readPageVideos() {
  const readData = name =>
    JSON.parse(fs.readFileSync(path.resolve('src/frontend/data', name), 'utf-8'));
  const home = readData('homePage.json').faq.video;
  const audit = readData('auditPage.json').architect.video;

  return {
    '/': {
      title: `${home.title}: ${home.label}`,
      description: home.description,
      thumbnail: home.poster,
      src: home.src,
      duration: home.duration,
      uploadDate: home.uploadDate,
    },
    '/audit/': {
      title: `ARG Architect: ${audit.title}`,
      description: audit.text,
      thumbnail: audit.cover,
      src: audit.src,
      duration: audit.duration,
      uploadDate: audit.uploadDate,
    },
  };
}

function renderVideo(video) {
  const [minutes, seconds] = video.duration.split(':').map(Number);
  return `
    <video:video>
      <video:thumbnail_loc>${escapeHtml(SITE_URL + video.thumbnail)}</video:thumbnail_loc>
      <video:title>${escapeHtml(video.title)}</video:title>
      <video:description>${escapeHtml(video.description)}</video:description>
      <video:content_loc>${escapeHtml(SITE_URL + video.src)}</video:content_loc>
      <video:duration>${minutes * 60 + seconds}</video:duration>
      <video:publication_date>${video.uploadDate}</video:publication_date>
    </video:video>`;
}

export function generateSitemap({ distDir, blogPostMetas }) {
  const sitemapUrls = [];
  const pageVideos = readPageVideos();

  sitemapUrls.push({
    loc: `${SITE_URL}/`,
    priority: '1.0',
    changefreq: 'weekly',
    video: pageVideos['/'],
  });
  for (const page of STATIC_PAGES) {
    sitemapUrls.push({
      loc: `${SITE_URL}${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
      video: pageVideos[page.path],
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

  for (const pattern of loadPatterns()) {
    const entry = {
      loc: `${SITE_URL}/patterns/${pattern.slug}/`,
      priority: '0.7',
      changefreq: 'monthly',
    };
    entry.lastmod = toContentDateOnly(pattern.dateModified);
    sitemapUrls.push(entry);
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${sitemapUrls
  .map(
    u =>
      `  <url>
    <loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.video ? renderVideo(u.video) : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  return sitemapUrls.length;
}
