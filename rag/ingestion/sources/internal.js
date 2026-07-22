import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { flattenJsonToText } from './json.js';
import { loadMarkdownSource } from './markdown.js';
import { loadPdfSource } from './pdf.js';
import { loadJsonSource } from './sources.js';

const PAGE_JSON_SOURCES = [
  {
    filePath: 'src/data/homepage.json',
    sourceType: 'homepage',
    sourceKey: 'homepage',
    title: 'Homepage',
    url: '/',
    label: 'homepage',
  },
  {
    filePath: 'src/data/about.json',
    sourceType: 'about',
    sourceKey: 'about',
    title: 'About ARG Software',
    url: '/about-us/',
    label: 'about',
  },
  {
    filePath: 'src/data/partnersPage.json',
    sourceType: 'partner',
    sourceKey: 'partners-page',
    title: 'Partners Page',
    url: '/partners/',
    label: 'partners page',
  },
  {
    filePath: 'src/data/jobs.json',
    sourceType: 'careers',
    sourceKey: 'jobs',
    title: 'Jobs and Hiring Traits',
    url: '/careers/',
    label: 'jobs',
  },
  {
    filePath: 'src/data/careersPage.json',
    sourceType: 'careers',
    sourceKey: 'careers-page',
    title: 'Careers Page',
    url: '/careers/',
    label: 'careers page',
  },
  {
    filePath: 'src/data/workingWithUs.json',
    sourceType: 'working_with_us',
    sourceKey: 'working-with-us',
    title: 'Working With Us',
    url: '/working-with-us/',
    label: 'working with us',
  },
  {
    filePath: 'src/data/faq.json',
    sourceType: 'faq',
    sourceKey: 'faq',
    title: 'Frequently Asked Questions',
    url: '/#faq',
    label: 'faq',
  },
];

export async function loadInternalSources(rootDir = process.cwd()) {
  const sources = [];

  for (const options of PAGE_JSON_SOURCES) {
    sources.push(await loadJsonSource(resolveRoot(rootDir, options.filePath), options));
  }

  sources.push(...(await loadProjectSources(rootDir)));
  sources.push(...(await loadPartnerSources(rootDir)));
  sources.push(...(await loadBlogSources(rootDir)));
  sources.push(...(await loadPdfSources(rootDir)));

  return sources;
}

async function loadProjectSources(rootDir) {
  const filePath = resolveRoot(rootDir, 'src/data/projects.json');
  const projects = JSON.parse(await readFile(filePath, 'utf8'));

  return projects.map(project => ({
    sourceType: 'project',
    sourceKey: project.slug,
    title: project.title,
    url: `/projects/${project.slug}/`,
    path: filePath,
    metadata: {
      source_file: filePath,
      client: project.client,
      category: project.subtitle,
      live_link: project.liveLink,
    },
    content: flattenJsonToText(project, `project ${project.title}`),
  }));
}

async function loadPartnerSources(rootDir) {
  const filePath = resolveRoot(rootDir, 'src/data/partners.json');
  const partners = JSON.parse(await readFile(filePath, 'utf8'));

  return partners.clients.map(partner => ({
    sourceType: 'partner',
    sourceKey: partner.slug,
    title: partner.name,
    url: '/partners/',
    path: filePath,
    metadata: {
      source_file: filePath,
      category: partner.category,
      industry: partner.industry,
      external_url: partner.link,
    },
    content: flattenJsonToText(partner, `partner ${partner.name}`),
  }));
}

async function loadBlogSources(rootDir) {
  const blogDir = resolveRoot(rootDir, 'src/blog');
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(blogDir, entry.name))
    .sort();

  return Promise.all(markdownFiles.map(filePath => loadMarkdownSource(filePath)));
}

async function loadPdfSources(rootDir) {
  const filePath = resolveRoot(rootDir, 'rag/config/internal-pdfs.json');
  const pdfs = JSON.parse(await readFile(filePath, 'utf8'));

  if (!Array.isArray(pdfs)) {
    throw new Error('rag/config/internal-pdfs.json must contain an array');
  }

  return Promise.all(
    pdfs.map(pdf => {
      validatePdfSource(pdf);
      return loadPdfSource(resolveRoot(rootDir, pdf.filePath), pdf);
    })
  );
}

function validatePdfSource(pdf) {
  if (!pdf || typeof pdf !== 'object') {
    throw new Error('Internal PDF entries must be objects');
  }

  for (const key of ['filePath', 'sourceKey', 'title', 'url']) {
    if (!pdf[key]) {
      throw new Error(`Internal PDF entries require ${key}`);
    }
  }
}

function resolveRoot(rootDir, filePath) {
  return path.join(rootDir, filePath);
}
