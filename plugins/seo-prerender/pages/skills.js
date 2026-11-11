import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { replaceMetaTags } from '../html-utils.js';
import { buildSkillStaticContent, injectStaticContent } from '../static-content.js';
import { buildSkillSchema } from '../../../src/frontend/utils/structuredData.js';

export function writeSkillPages({ distDir, baseHtml, generated }) {
  const skillsPath = path.resolve('src/frontend/data/skills.json');
  if (!fs.existsSync(skillsPath)) return generated;

  const { skills = [], repository } = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));
  let count = generated;

  for (const skill of skills) {
    if (!skill.slug) continue;

    const skillUrl = `${SITE_URL}/skills/${skill.slug}/`;
    let html = replaceMetaTags(baseHtml, {
      title: skill.seoTitle,
      socialTitle: skill.seoTitle,
      description: skill.seoDescription,
      url: skillUrl,
      type: 'website',
      jsonLd: buildSkillSchema(skill, repository),
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'AI Skills', path: '/skills/' },
        { name: skill.title, path: `/skills/${skill.slug}/` },
      ],
    });

    const otherSkillLinks = skills
      .filter(other => other.slug && other.slug !== skill.slug)
      .map(other => ({ href: `/skills/${other.slug}/`, label: other.title }));
    html = injectStaticContent(html, buildSkillStaticContent(skill, otherSkillLinks));

    const dir = path.join(distDir, 'skills', skill.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  return count;
}
