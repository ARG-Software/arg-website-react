import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { RagSource, RagSourceMetadata } from '../../types/ingestion.js';
import type { IngestionSelection } from '../scripts/cli.js';
import { flattenJsonToText } from './json.js';
import { loadMarkdownSource } from './markdown.js';
import { loadPdfSource, type PdfSourceMetadata, type RequiredPdfSourceMetadata } from './pdf.js';
import { loadJsonSource, type JsonSourceOptions } from './sources.js';

interface JsonManifestSource extends JsonSourceOptions {
  kind: 'json';
  filePath: string;
}

interface FileManifestSource {
  kind: 'projects_json' | 'partners_json' | 'markdown_dir' | 'pdf_manifest';
  filePath: string;
}

type InternalManifestSource = JsonManifestSource | FileManifestSource;

interface ProjectJson extends RagSourceMetadata {
  slug: string;
  title: string;
  client?: string;
  subtitle?: string;
  liveLink?: string;
}

interface PartnerJson extends RagSourceMetadata {
  slug: string;
  name: string;
  category?: string;
  industry?: string;
  link?: string;
}

interface PartnersJson {
  clients: PartnerJson[];
}

export async function loadInternalSources(
  rootDir = process.cwd(),
  selection?: IngestionSelection
): Promise<RagSource[]> {
  const manifest = await loadInternalManifest(rootDir);
  const sources: RagSource[] = [];

  for (const entry of manifest) {
    if (!shouldLoadManifestEntry(entry, selection)) {
      continue;
    }

    sources.push(...(await loadManifestEntry(rootDir, entry)));
  }

  return filterLoadedSources(sources, selection);
}

async function loadManifestEntry(rootDir: string, entry: InternalManifestSource): Promise<RagSource[]> {
  switch (entry.kind) {
    case 'json':
      return [await loadJsonSource(resolveRoot(rootDir, entry.filePath), entry)];
    case 'projects_json':
      return loadProjectSources(rootDir, entry.filePath);
    case 'partners_json':
      return loadPartnerSources(rootDir, entry.filePath);
    case 'markdown_dir':
      return loadBlogSources(rootDir, entry.filePath);
    case 'pdf_manifest':
      return loadPdfSources(rootDir, entry.filePath);
  }
}

async function loadProjectSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const projects = JSON.parse(await readFile(filePath, 'utf8')) as ProjectJson[];

  return projects.map(project => ({
    sourceType: 'project' as const,
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

async function loadPartnerSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const partners = JSON.parse(await readFile(filePath, 'utf8')) as PartnersJson;

  return partners.clients.map(partner => ({
    sourceType: 'partner' as const,
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

async function loadBlogSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const blogDir = resolveRoot(rootDir, relativeFilePath);
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(blogDir, entry.name))
    .sort();

  return Promise.all(markdownFiles.map(filePath => loadMarkdownSource(filePath)));
}

async function loadPdfSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const pdfs = JSON.parse(await readFile(filePath, 'utf8')) as PdfSourceMetadata[];

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

function validatePdfSource(pdf: PdfSourceMetadata): asserts pdf is RequiredPdfSourceMetadata {
  if (!pdf || typeof pdf !== 'object') {
    throw new Error('Internal PDF entries must be objects');
  }

  for (const key of ['filePath', 'sourceKey', 'title', 'url']) {
    if (!pdf[key]) {
      throw new Error(`Internal PDF entries require ${key}`);
    }
  }
}

async function loadInternalManifest(rootDir: string): Promise<InternalManifestSource[]> {
  const filePath = resolveRoot(rootDir, 'rag/config/internal-sources.json');
  const sources = JSON.parse(await readFile(filePath, 'utf8')) as InternalManifestSource[];

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/internal-sources.json must contain an array');
  }

  return sources.map(validateManifestEntry);
}

function validateManifestEntry(entry: InternalManifestSource): InternalManifestSource {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Internal source manifest entries must be objects');
  }

  if (!entry.kind || !entry.filePath) {
    throw new Error('Internal source manifest entries require kind and filePath');
  }

  if (entry.kind === 'json' && (!entry.sourceType || !entry.sourceKey || !entry.title)) {
    throw new Error('JSON internal source manifest entries require sourceType, sourceKey, and title');
  }

  return entry;
}

function shouldLoadManifestEntry(
  entry: InternalManifestSource,
  selection: IngestionSelection | undefined
): boolean {
  if (!selection || selection.all) {
    return true;
  }

  if (selection.filePaths.some(filePath => samePath(filePath, entry.filePath))) {
    return true;
  }

  if (entry.kind === 'json') {
    return selection.sourceKeys.includes(entry.sourceKey ?? '');
  }

  return selection.sourceKeys.length > 0;
}

function filterLoadedSources(
  sources: RagSource[],
  selection: IngestionSelection | undefined
): RagSource[] {
  if (!selection || selection.all) {
    return sources;
  }

  return sources.filter(source => {
    if (selection.sourceKeys.includes(source.sourceKey)) {
      return true;
    }

    if (!source.path) {
      return false;
    }

    const sourcePath = source.path;
    return selection.filePaths.some(filePath => samePath(filePath, sourcePath));
  });
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(normalizedRight) ||
    normalizedRight.endsWith(normalizedLeft)
  );
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveRoot(rootDir: string, filePath: string): string {
  return path.join(rootDir, filePath);
}
