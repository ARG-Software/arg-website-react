import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { flattenJsonToText } from '../extractors/json.js';
import { parseFrontmatter } from '../extractors/markdown.js';
import { extractPdfText } from '../extractors/pdf.js';
import { stripMarkdown } from '../processing/text.js';
import { createSource } from '../sourceFactory.js';
import type {
  AboutJson,
  CareersJson,
  HomepageJson,
  PartnersJson,
  ProjectJson,
} from './internal-content.js';
import type {
  InternalManifestEntry,
  JsonManifestEntry,
  PdfManifestEntry,
  ValidatedPdfManifestEntry,
} from '../manifest.js';
import type { IngestionRunOptions } from '../../types/ingestion.js';
import type { RagSource, RagSourceMetadata } from '../../types/source.js';

const PERSON_SOURCE_KEYS: Record<string, string> = {
  jose: 'jose-antunes',
  rui: 'rui-rocha',
};

export async function loadInternalSources(
  rootDir = process.cwd(),
  selection?: IngestionRunOptions
): Promise<RagSource[]> {
  const manifest = await loadInternalManifest(rootDir);
  const sources: RagSource[] = [];

  for (const entry of manifest) {
    if (shouldLoadManifestEntry(entry, selection)) {
      sources.push(...(await loadManifestEntry(rootDir, entry)));
    }
  }

  sources.push(...(await loadTeamProfileSources(rootDir)));
  return filterLoadedSources(sources, selection);
}

async function loadManifestEntry(rootDir: string, entry: InternalManifestEntry): Promise<RagSource[]> {
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

async function loadJsonSource(filePath: string, options: JsonManifestEntry): Promise<RagSource> {
  const sourceKey = options.sourceKey ?? path.basename(filePath, path.extname(filePath));
  const json = await readJsonFile(filePath);

  return createSource({
    sourceType: options.sourceType,
    sourceKey,
    title: options.title ?? sourceKey,
    url: options.url,
    path: filePath,
    metadata: { ...(options.metadata ?? {}), source_file: filePath },
    content: flattenJsonToText(json, options.label),
  });
}

async function loadProjectSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const projects = await readJsonFile<ProjectJson[]>(filePath);

  return projects.map(project =>
    createSource({
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
    })
  );
}

async function loadPartnerSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const partners = await readJsonFile<PartnersJson>(filePath);

  return partners.clients.map(partner =>
    createSource({
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
    })
  );
}

async function loadTeamProfileSources(rootDir: string): Promise<RagSource[]> {
  const homepagePath = resolveRoot(rootDir, 'src/data/homepage.json');
  const aboutPath = resolveRoot(rootDir, 'src/data/about.json');
  const careersPath = resolveRoot(rootDir, 'src/data/careersPage.json');
  const [homepage, about, careers] = await Promise.all([
    readJsonFile<HomepageJson>(homepagePath),
    readJsonFile<AboutJson>(aboutPath),
    readJsonFile<CareersJson>(careersPath),
  ]);
  const sourceFiles = [homepagePath, aboutPath, careersPath];
  const sources: RagSource[] = [
    createSource({
      sourceType: 'about',
      sourceKey: 'arg-team',
      title: 'ARG Team',
      url: '/about-us/',
      path: aboutPath,
      metadata: { source_files: sourceFiles },
      content: [
        'ARG Team',
        homepage.team.intro,
        'The only individually named public team members are the two co-founders:',
        ...about.founders.people.map(person => `${person.name}: ${person.role}. ${person.focus}.`),
        'ARG also works with a trusted network of collaborators whose individual names are not publicly listed.',
        ...about.collaborators.paragraphs,
        `Publicly described collaborator disciplines: ${about.collaborators.disciplines.join(', ')}.`,
      ].join('\n\n'),
    }),
  ];

  for (const person of about.founders.people) {
    const homepageMember = homepage.team.members.find(
      member => member.personKey.toLowerCase() === person.id.toLowerCase()
    );
    const careersCard = careers.founders.cards.find(
      card => card.personKey.toLowerCase() === person.id.toLowerCase()
    );

    sources.push(
      createSource({
        sourceType: 'about',
        sourceKey: PERSON_SOURCE_KEYS[person.id] ?? person.id,
        title: person.name,
        url: '/about-us/',
        path: aboutPath,
        metadata: { source_files: sourceFiles, person_key: person.id },
        content: [
          person.name,
          person.role,
          person.bio,
          `Primary focus: ${person.focus}.`,
          `Areas: ${person.tags.join(', ')}.`,
          homepageMember ? `Homepage role: ${homepageMember.role}.` : '',
          careersCard ? `Careers contact focus: ${careersCard.focus}.` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
    );
  }

  return sources;
}

async function loadBlogSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const blogDir = resolveRoot(rootDir, relativeFilePath);
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(blogDir, entry.name))
    .sort();

  return Promise.all(markdownFiles.map(loadMarkdownSource));
}

async function loadMarkdownSource(filePath: string): Promise<RagSource> {
  const { frontmatter, body } = parseFrontmatter(await readFile(filePath, 'utf8'));
  const slug = getFrontmatterString(frontmatter, 'slug');
  const fallbackName = path.basename(filePath, path.extname(filePath));

  return createSource({
    sourceType: 'blog_post',
    sourceKey: slug ?? fallbackName,
    title: getFrontmatterString(frontmatter, 'title') ?? fallbackName,
    url: slug ? `/blog/${slug}/` : undefined,
    path: filePath,
    metadata: frontmatter,
    content: stripMarkdown(body),
  });
}

async function loadPdfSources(rootDir: string, relativeFilePath: string): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const pdfs = await readJsonFile<PdfManifestEntry[]>(filePath);

  if (!Array.isArray(pdfs)) {
    throw new Error('rag/config/internal-pdfs.json must contain an array');
  }

  return Promise.all(
    pdfs.map(async pdf => {
      validatePdfSource(pdf);
      const pdfPath = resolveRoot(rootDir, pdf.filePath);
      return createSource({
        sourceType: 'portfolio_pdf',
        sourceKey: pdf.sourceKey,
        title: pdf.title,
        url: pdf.url,
        path: pdfPath,
        metadata: pdf,
        content: await extractPdfText(pdfPath),
      });
    })
  );
}

function validatePdfSource(pdf: PdfManifestEntry): asserts pdf is ValidatedPdfManifestEntry {
  if (!pdf || typeof pdf !== 'object') {
    throw new Error('Internal PDF entries must be objects');
  }

  for (const key of ['filePath', 'sourceKey', 'title', 'url'] as const) {
    if (!pdf[key]) {
      throw new Error(`Internal PDF entries require ${key}`);
    }
  }
}

async function loadInternalManifest(rootDir: string): Promise<InternalManifestEntry[]> {
  const filePath = resolveRoot(rootDir, 'rag/config/internal-sources.json');
  const sources = await readJsonFile<InternalManifestEntry[]>(filePath);

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/internal-sources.json must contain an array');
  }

  return sources.map(validateManifestEntry);
}

function validateManifestEntry(entry: InternalManifestEntry): InternalManifestEntry {
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
  entry: InternalManifestEntry,
  selection: IngestionRunOptions | undefined
): boolean {
  if (!selection || selection.all) {
    return true;
  }

  if (selection.filePaths.some(filePath => samePath(filePath, entry.filePath))) {
    return true;
  }

  return entry.kind === 'json'
    ? selection.sourceKeys.includes(entry.sourceKey ?? '')
    : selection.sourceKeys.length > 0;
}

function filterLoadedSources(sources: RagSource[], selection: IngestionRunOptions | undefined): RagSource[] {
  if (!selection || selection.all) {
    return sources;
  }

  return sources.filter(source => {
    if (selection.sourceKeys.includes(source.sourceKey)) {
      return true;
    }

    const sourcePaths = [source.path, ...getSourceFilePaths(source.metadata)].filter(
      (filePath): filePath is string => Boolean(filePath)
    );
    return sourcePaths.some(sourcePath =>
      selection.filePaths.some(filePath => samePath(filePath, sourcePath))
    );
  });
}

function getSourceFilePaths(metadata: RagSourceMetadata | undefined): string[] {
  const sourceFiles = metadata?.source_files;
  return Array.isArray(sourceFiles)
    ? sourceFiles.filter((filePath): filePath is string => typeof filePath === 'string')
    : [];
}

async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function getFrontmatterString(frontmatter: RagSourceMetadata, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
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
