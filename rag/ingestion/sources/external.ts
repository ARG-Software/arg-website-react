import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { extractHtmlText, fetchExternalHtml } from '../extractors/html.js';
import { createSource } from '../sourceFactory.js';
import type { IngestionRunOptions } from '../../types/ingestion.js';
import type { RagSource } from '../../types/source.js';
import type { ExternalSourceManifestEntry } from '../manifest.js';

export async function loadExternalSourceEntries(
  rootDir = process.cwd(),
  selection?: IngestionRunOptions
): Promise<ExternalSourceManifestEntry[]> {
  const filePath = path.join(rootDir, 'rag/config/external-sources.json');
  const sources = JSON.parse(await readFile(filePath, 'utf8'));

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/external-sources.json must contain an array');
  }

  return filterExternalSourceEntries(sources.map(validateExternalSourceEntry), selection);
}

export async function loadExternalSource({
  url,
  title,
  trusted = true,
}: ExternalSourceManifestEntry): Promise<RagSource> {
  const content = await extractHtmlText(await fetchExternalHtml(url));
  const parsedUrl = new URL(url);

  return createSource({
    sourceType: 'external_page',
    sourceKey: url,
    title: title ?? parsedUrl.hostname,
    url,
    metadata: {
      domain: parsedUrl.hostname,
      trusted,
    },
    content,
  });
}

function validateExternalSourceEntry(item: unknown): ExternalSourceManifestEntry {
  if (!item || typeof item !== 'object') {
    throw new Error('External source entries must be objects');
  }

  if (!('url' in item) || !item.url) {
    throw new Error('External source entries require a url');
  }

  const rawUrl = String(item.url);
  const url = new URL(rawUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`External source URL must be HTTP(S): ${rawUrl}`);
  }

  return {
    url: url.toString(),
    title: 'title' in item && typeof item.title === 'string' ? item.title : undefined,
    trusted: 'trusted' in item && typeof item.trusted === 'boolean' ? item.trusted : true,
  };
}

function filterExternalSourceEntries(
  entries: ExternalSourceManifestEntry[],
  selection: IngestionRunOptions | undefined
): ExternalSourceManifestEntry[] {
  if (selection && !selection.all) {
    return entries.filter(entry => {
      const normalizedUrl = new URL(entry.url).toString();
      return (
        selection?.urls.some(url => new URL(url).toString() === normalizedUrl) ||
        selection?.sourceKeys.includes(entry.url) ||
        (entry.title ? selection?.sourceKeys.includes(entry.title) : false)
      );
    });
  }

  return entries;
}
