import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, STATIC_PAGES } from '../constants.js';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { replaceMetaTags } from '../html-utils.js';
import { loadPatterns } from './patterns.js';

function getSkillLinks() {
  const skillsPath = path.resolve('src/frontend/data/skills.json');
  if (!fs.existsSync(skillsPath)) return [];

  const { skills = [] } = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));
  return skills
    .filter(skill => skill.slug)
    .map(skill => ({ href: `/skills/${skill.slug}/`, label: skill.title }));
}

export function writeStaticPages({ distDir, baseHtml, blogPostLinks, generated }) {
  let count = generated;
  for (const page of STATIC_PAGES) {
    let html = replaceMetaTags(baseHtml, {
      title: page.title,
      socialTitle: page.socialTitle,
      description: page.description,
      url: `${SITE_URL}${page.path}`,
      type: 'website',
      pageType: page.pageType,
      breadcrumbs: page.breadcrumbs,
      jsonLd: page.jsonLd,
    });
    let extraLinks = [];
    if (page.path === '/blog/') extraLinks = blogPostLinks;
    if (page.path === '/skills/') extraLinks = getSkillLinks();
    if (page.path === '/patterns/') {
      extraLinks = loadPatterns().map(pattern => ({
        href: `/patterns/${pattern.slug}/`,
        label: pattern.title,
      }));
    }
    html = injectCrawlableBlock(
      html,
      buildCrawlableBlock(page.h1, {
        description: page.description,
        paragraphs: page.paragraphs || [],
        extraLinks,
      })
    );

    const dir = path.join(distDir, page.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
