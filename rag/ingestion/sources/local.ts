import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { flattenJsonToText } from '../extractors/json.js';
import { parseFrontmatter } from '../extractors/markdown.js';
import { extractPdfText } from '../extractors/pdf.js';
import { redactCvContent } from '../processing/redaction.js';
import { stripMarkdown } from '../processing/text.js';
import { createSource } from '../sourceFactory.js';
import type {
  AboutJson,
  CareersJson,
  HomepageJson,
  PartnersJson,
  ProjectJson,
} from './local-content.js';
import type {
  LocalDocumentManifestEntry,
  LocalManifestEntry,
  JsonManifestEntry,
} from '../manifest.js';
import { HOMEPAGE_SECTION_SCOPES } from '../../config/homepageSections.js';
import type { IngestionRunOptions } from '../../core/types/ingestion.js';
import type { RagSource, RagSourceMetadata } from '../../core/types/source.js';

const PERSON_SOURCE_KEYS: Record<string, string> = {
  jose: 'jose-antunes',
  rui: 'rui-rocha',
};

export async function loadLocalSources(
  rootDir = process.cwd(),
  selection?: IngestionRunOptions
): Promise<RagSource[]> {
  const manifest = await loadLocalManifest(rootDir);
  const sources: RagSource[] = [];

  for (const entry of manifest) {
    if (shouldLoadManifestEntry(rootDir, entry, selection)) {
      sources.push(...(await loadManifestEntry(rootDir, entry, selection)));
    }
  }

  sources.push(...(await loadTeamProfileSources(rootDir)));
  return filterLoadedSources(sources, selection);
}

async function loadManifestEntry(
  rootDir: string,
  entry: LocalManifestEntry,
  selection?: IngestionRunOptions
): Promise<RagSource[]> {
  switch (entry.kind) {
    case 'json':
      if (entry.sourceKey === 'homepage') {
        return loadHomepageSectionSources(rootDir, entry);
      }
      return [await loadJsonSource(resolveRoot(rootDir, entry.filePath), entry)];
    case 'projects_json':
      return loadProjectSources(rootDir, entry.filePath);
    case 'partners_json':
      return loadPartnerSources(rootDir, entry.filePath);
    case 'markdown_dir':
      return loadBlogSources(rootDir, entry.filePath, selection);
    case 'local_document_manifest':
      return loadLocalDocumentSources(rootDir, entry.filePath, selection);
  }
}

async function loadHomepageSectionSources(
  rootDir: string,
  entry: JsonManifestEntry
): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, entry.filePath);
  const homepage = await readJsonFile<Record<string, unknown>>(filePath);

  return Object.entries(HOMEPAGE_SECTION_SCOPES).map(([sectionId, scope]) =>
    createSource({
      sourceType: 'homepage',
      sourceKey: scope.sourceKey,
      title: scope.title,
      url: `/#${sectionId}`,
      path: filePath,
      metadata: { source_file: filePath, section_id: sectionId },
      content: flattenJsonToText(homepage[scope.dataKey], `homepage ${scope.title}`),
    })
  );
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
        metadata: {
          source_files: sourceFiles,
          person_key: person.id,
          evidence_scope: 'individual_public',
        },
        content: [
          person.name,
          person.role,
          `Professional background and education: ${person.bio}`,
          `Primary focus: ${person.focus}.`,
          person.languageExperience ? `Language experience: ${person.languageExperience}` : '',
          `Experience areas: ${person.tags.join(', ')}.`,
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

async function loadBlogSources(
  rootDir: string,
  relativeFilePath: string,
  selection?: IngestionRunOptions
): Promise<RagSource[]> {
  const blogDir = resolveRoot(rootDir, relativeFilePath);
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(blogDir, entry.name))
    .filter(filePath => matchesFileSelection(filePath, selection))
    .sort();

  return Promise.all(markdownFiles.map(loadMarkdownSource));
}

async function loadMarkdownSource(filePath: string): Promise<RagSource> {
  const { frontmatter, body } = parseFrontmatter(await readFile(filePath, 'utf8'));
  const slug = getFrontmatterString(frontmatter, 'slug');
  const fallbackName = path.basename(filePath, path.extname(filePath));
  const title = getFrontmatterString(frontmatter, 'title') ?? fallbackName;
  const subtitle = getFrontmatterString(frontmatter, 'subtitle') ?? getFrontmatterString(frontmatter, 'intro') ?? '';
  const published = getFrontmatterString(frontmatter, 'date') ?? '';
  const topic = getFrontmatterString(frontmatter, 'tag') ?? '';

  return createSource({
    sourceType: 'blog_post',
    sourceKey: slug ?? fallbackName,
    title,
    url: slug ? `/blog/${slug}/` : undefined,
    path: filePath,
    metadata: frontmatter,
    content: [
      'Blog post',
      `Title: ${title}`,
      `Subtitle: ${subtitle}`,
      `Published: ${published}`,
      `Topic: ${topic}`,
      '',
      stripMarkdown(body),
    ].join('\n'),
  });
}

async function loadLocalDocumentSources(
  rootDir: string,
  relativeFilePath: string,
  selection?: IngestionRunOptions
): Promise<RagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const documents = await readJsonFile<LocalDocumentManifestEntry[]>(filePath);

  if (!Array.isArray(documents)) {
    throw new Error('rag/config/local-documents.json must contain an array');
  }

  const validDocuments = documents.map(document => {
    validateLocalDocument(document, rootDir);
    return document;
  });

  return Promise.all(
    validDocuments
      .filter(document => matchesFileSelection(resolveRoot(rootDir, document.filePath), selection))
      .map(async document => {
      const documentPath = resolveRoot(rootDir, document.filePath);
      const extractedContent = await extractPdfText(documentPath);
      return createSource({
        sourceType: 'local_document',
        sourceKey: document.sourceKey,
        title: document.title,
        url: document.citationUrl,
        path: documentPath,
        isPublic: document.isPublic ?? true,
        metadata: {
          ...document,
          source_file: documentPath,
          person_key: typeof document.personKey === 'string' ? document.personKey : undefined,
          evidence_scope: document.documentKind === 'cv' ? 'individual_private_evidence' : 'company',
        },
        content:
          document.documentKind === 'cv'
            ? redactCvContent(extractedContent, document.redaction?.literals)
            : extractedContent,
      });
      })
  );
}

function validateLocalDocument(document: LocalDocumentManifestEntry, rootDir: string): void {
  if (!document || typeof document !== 'object') {
    throw new Error('Local document entries must be objects');
  }

  for (const key of ['format', 'filePath', 'sourceKey', 'title', 'documentKind'] as const) {
    if (!document[key]) {
      throw new Error(`Local document entries require ${key}`);
    }
  }

  if (document.format !== 'pdf') {
    throw new Error(`Unsupported local document format: ${document.format}`);
  }

  if (document.documentKind === 'cv') {
    if (!document.redaction || document.redaction.profile !== 'cv' || !document.redaction.manualReview) {
      throw new Error(`CV document ${document.sourceKey} requires a manually reviewed CV redaction policy`);
    }

    if (isPathInDirectory(rootDir, document.filePath, 'public')) {
      throw new Error(`CV document ${document.sourceKey} must not be stored under public/`);
    }
  }
}

async function loadLocalManifest(rootDir: string): Promise<LocalManifestEntry[]> {
  const filePath = resolveRoot(rootDir, 'rag/config/local-sources.json');
  const sources = await readJsonFile<LocalManifestEntry[]>(filePath);

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/local-sources.json must contain an array');
  }

  return sources.map(validateManifestEntry);
}

function validateManifestEntry(entry: LocalManifestEntry): LocalManifestEntry {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Local source manifest entries must be objects');
  }

  if (!entry.kind || !entry.filePath) {
    throw new Error('Local source manifest entries require kind and filePath');
  }

  if (entry.kind === 'json' && (!entry.sourceType || !entry.sourceKey || !entry.title)) {
    throw new Error('JSON local source manifest entries require sourceType, sourceKey, and title');
  }

  return entry;
}

function shouldLoadManifestEntry(
  rootDir: string,
  entry: LocalManifestEntry,
  selection: IngestionRunOptions | undefined
): boolean {
  if (!selection || selection.all) {
    return true;
  }

  if (selection.filePaths.some(filePath => samePath(filePath, entry.filePath))) {
    return true;
  }

  if (
    entry.kind === 'markdown_dir' &&
    selection.filePaths.some(filePath => isPathInDirectory(rootDir, filePath, entry.filePath))
  ) {
    return true;
  }

  // The document manifest must be read to match a selected document against its configured path.
  if (entry.kind === 'local_document_manifest' && selection.filePaths.length > 0) {
    return true;
  }

  if (entry.kind !== 'json') {
    return selection.sourceKeys.length > 0;
  }

  return (
    selection.sourceKeys.includes(entry.sourceKey ?? '') ||
    (entry.sourceKey === 'homepage' &&
      selection.sourceKeys.some(sourceKey => sourceKey.startsWith('home:')))
  );
}

function matchesFileSelection(filePath: string, selection: IngestionRunOptions | undefined): boolean {
  return (
    !selection ||
    selection.all ||
    selection.filePaths.length === 0 ||
    selection.sourceKeys.length > 0 ||
    selection.filePaths.some(selectedFilePath => samePath(selectedFilePath, filePath))
  );
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

function isPathInDirectory(rootDir: string, filePath: string, directoryPath: string): boolean {
  const resolvedFilePath = path.resolve(rootDir, filePath);
  const resolvedDirectoryPath = path.resolve(rootDir, directoryPath);
  const relativePath = path.relative(resolvedDirectoryPath, resolvedFilePath);

  return !relativePath || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveRoot(rootDir: string, filePath: string): string {
  return path.join(rootDir, filePath);
}
