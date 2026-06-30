import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { replaceMetaTags } from '../html-utils.js';
import { getProjectExtraLinks } from '../links.js';

export function writeProjectPages({ distDir, baseHtml, generated }) {
  const projectsPath = path.resolve('src/data/projects.json');
  if (!fs.existsSync(projectsPath)) return generated;

  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
  let count = generated;
  const projectLinks = getProjectExtraLinks();

  for (const project of projects) {
    if (!project.slug) continue;

    const projectUrl = `${SITE_URL}/projects/${project.slug}/`;
    const title = `${project.title} - Use Case | Arg Software`;
    const description = (project.intro || project.challenge || '')
      .replace(/\n+/g, ' ')
      .slice(0, 160)
      .trim();

    let html = replaceMetaTags(baseHtml, {
      title,
      description,
      url: projectUrl,
      image: project.imgSrc || '',
      type: 'website',
    });

    html = injectCrawlableBlock(
      html,
      buildCrawlableBlock(project.title || project.slug, {
        description,
        subtitle: project.subtitle || '',
        extraLinks: projectLinks,
      })
    );

    const dir = path.join(distDir, 'projects', project.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
