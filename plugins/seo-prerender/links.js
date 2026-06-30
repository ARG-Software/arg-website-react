import fs from 'node:fs';
import path from 'node:path';

export const LEGAL_LINKS = [
  { href: '/privacy/', label: 'Privacy Policy' },
  { href: '/terms/', label: 'Terms of Service' },
];

let _projectLinksCache = null;

export function loadProjectLinks() {
  if (_projectLinksCache) return _projectLinksCache;
  const projectsPath = path.resolve('src/data/projects.json');
  if (!fs.existsSync(projectsPath)) {
    _projectLinksCache = [];
    return _projectLinksCache;
  }
  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
  _projectLinksCache = projects
    .filter(p => p.slug)
    .map(p => ({ href: `/projects/${p.slug}/`, label: p.title }));
  return _projectLinksCache;
}

export function getHomepageExtraLinks() {
  return [...loadProjectLinks(), ...LEGAL_LINKS];
}

export function getProjectExtraLinks() {
  return loadProjectLinks();
}
