import type { IIngestionRunOptions } from '../../../application/ingestion/iingestion.types.js';
import type { IRagSource, RagSourceMetadata } from '../../../domain/sources/ragsource.types.js';
import type { LocalManifestEntry } from '../sourcemanifest.types.js';
import { getFirstPartySourceEntries } from '../sourcemanifest.config.js';
import { isPathInDirectory, resolveRoot, samePath } from './loaderfiles.js';
import {
  loadHomepageSectionSources,
  loadInlineJsonSource,
  loadJsonSource,
} from './loadjsonmanifestsources.js';
import { loadProjectSources } from './loadprojectsources.js';
import { loadPartnerSources } from './loadpartnersources.js';
import { loadTeamProfileSources } from './loadteamprofilesources.js';
import { loadBlogSources } from './loadblogsources.js';
import { loadLocalDocumentSource } from './loadlocaldocumentsources.js';

export async function loadFirstPartySources(
  rootDir = process.cwd(),
  selection?: IIngestionRunOptions
): Promise<IRagSource[]> {
  const manifest = loadLocalManifest();
  const sources: IRagSource[] = [];

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
  selection?: IIngestionRunOptions
): Promise<IRagSource[]> {
  switch (entry.kind) {
    case 'json':
      if (entry.sourceKey === 'homepage') {
        return loadHomepageSectionSources(rootDir, entry);
      }
      return [await loadJsonSource(resolveRoot(rootDir, entry.filePath), entry)];
    case 'inline_json':
      return [loadInlineJsonSource(rootDir, entry)];
    case 'projects_json':
      return loadProjectSources(rootDir, entry.filePath);
    case 'partners_json':
      return loadPartnerSources(rootDir, entry.filePath);
    case 'markdown_dir':
      return loadBlogSources(rootDir, entry.filePath, selection);
    case 'local_document':
      return loadLocalDocumentSource(rootDir, entry, selection);
  }
}

function loadLocalManifest(): LocalManifestEntry[] {
  return getFirstPartySourceEntries().map(validateManifestEntry);
}

function validateManifestEntry(entry: LocalManifestEntry): LocalManifestEntry {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Local source manifest entries must be objects');
  }

  if (!entry.kind || (entry.kind !== 'inline_json' && !entry.filePath)) {
    throw new Error('Local source manifest entries require kind and filePath');
  }

  if (entry.kind === 'json' && (!entry.sourceType || !entry.sourceKey || !entry.title)) {
    throw new Error('JSON local source manifest entries require sourceType, sourceKey, and title');
  }

  if (entry.kind === 'inline_json' && (!entry.sourceType || !entry.sourceKey || !entry.title)) {
    throw new Error('Inline JSON local source manifest entries require sourceType, sourceKey, and title');
  }

  return entry;
}

function shouldLoadManifestEntry(
  rootDir: string,
  entry: LocalManifestEntry,
  selection: IIngestionRunOptions | undefined
): boolean {
  if (!selection || selection.all) {
    return true;
  }

  const manifestPath = entry.kind === 'inline_json' ? entry.virtualPath : entry.filePath;

  if (selection.filePaths.some(filePath => samePath(filePath, manifestPath))) {
    return true;
  }

  if (
    entry.kind === 'markdown_dir' &&
    selection.filePaths.some(filePath => isPathInDirectory(rootDir, filePath, entry.filePath))
  ) {
    return true;
  }

  if (entry.kind === 'local_document') {
    return selection.sourceKeys.includes(entry.sourceKey);
  }

  if (entry.kind !== 'json' && entry.kind !== 'inline_json') {
    return selection.sourceKeys.length > 0;
  }

  return (
    selection.sourceKeys.includes(entry.sourceKey ?? '') ||
    (entry.sourceKey === 'homepage' &&
      selection.sourceKeys.some(sourceKey => sourceKey.startsWith('home:')))
  );
}

function filterLoadedSources(sources: IRagSource[], selection: IIngestionRunOptions | undefined): IRagSource[] {
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
