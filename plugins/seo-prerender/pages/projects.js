import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { replaceMetaTags } from '../html-utils.js';
import { getProjectExtraLinks } from '../links.js';
import { buildProjectStaticContent, injectStaticContent } from '../static-content.js';
import { buildProjectSchema } from '../../../src/frontend/utils/structuredData.js';

export function writeProjectPages({ distDir, baseHtml, generated }) {
  const projectsPath = path.resolve('src/frontend/data/projects.json');
  if (!fs.existsSync(projectsPath)) return generated;

  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
  let count = generated;
  const projectLinks = getProjectExtraLinks();

  for (const project of projects) {
    if (!project.slug) continue;

    const projectUrl = `${SITE_URL}/projects/${project.slug}/`;
    const title = `${project.title} - Use Case | ARG Software`;
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
      jsonLd: buildProjectSchema(project),
    });

    html = injectStaticContent(html, buildProjectStaticContent(project, projectLinks));

    const dir = path.join(distDir, 'projects', project.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
