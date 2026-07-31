import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { EXTERNAL_SOURCE_ENTRIES } from '../../config/externalSources.js';
import { extractHtmlText, fetchExternalHtml } from '../extractors/html.js';
import { createSource } from '../sourceFactory.js';
import type { IngestionRunOptions } from '../types.js';
import type { RagSource } from '../../domain/content/RagSource.js';
import type { ExternalSourceManifestEntry } from '../manifest.js';
import { escapeRegExp } from '../../shared/regex.js';

export async function loadExternalSourceEntries(
  rootDir = process.cwd(),
  selection?: IngestionRunOptions
): Promise<ExternalSourceManifestEntry[]> {
  void rootDir;

  return filterExternalSourceEntries(EXTERNAL_SOURCE_ENTRIES.map(validateExternalSourceEntry), selection);
}

export async function loadExternalSource({
  sourceKey,
  url,
  title,
  snapshotPath,
}: ExternalSourceManifestEntry): Promise<RagSource> {
  const parsedUrl = new URL(url);
  const snapshot = snapshotPath
    ? {
        html: await readFile(path.resolve(process.cwd(), snapshotPath), 'utf8'),
        finalUrl: url,
      }
    : await fetchExternalHtml(url, parsedUrl.hostname);

  return createSource({
    sourceType: 'external_page',
    sourceKey,
    title,
    url: snapshot.finalUrl,
    origin: 'trusted_external',
    metadata: {
      domain: parsedUrl.hostname,
      trusted: true,
      evidence_scope: 'approved_trusted_external_reference',
    },
    content:
      sourceKey === 'designrush' && snapshotPath
        ? await extractDesignRushFacts(snapshot.html)
        : await extractHtmlText(snapshot.html),
  });
}

function validateExternalSourceEntry(item: unknown): ExternalSourceManifestEntry {
  if (!item || typeof item !== 'object') {
    throw new Error('External source entries must be objects');
  }

  if (!('sourceKey' in item) || !item.sourceKey || !('url' in item) || !item.url || !('title' in item)) {
    throw new Error('External source entries require sourceKey, url, and title');
  }

  if (!('trusted' in item) || item.trusted !== true) {
    throw new Error('External source entries must explicitly set trusted to true');
  }

  const sourceKey = String(item.sourceKey).trim();
  const title = String(item.title).trim();
  const snapshotPath =
    'snapshotPath' in item && typeof item.snapshotPath === 'string'
      ? item.snapshotPath.trim()
      : undefined;

  if (!sourceKey || !title) {
    throw new Error('External source entries require a non-empty sourceKey and title');
  }

  const rawUrl = String(item.url);
  const url = new URL(rawUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`External source URL must be HTTP(S): ${rawUrl}`);
  }

  return {
    sourceKey,
    url: url.toString(),
    title,
    ...(snapshotPath ? { snapshotPath } : {}),
    trusted: true,
  };
}

async function extractDesignRushFacts(html: string): Promise<string> {
  const text = await extractHtmlText(html);
  const hourlyRate = text.match(/Average Hourly Rate\s*(\$[\d,]+\s*\/\s*hr)/i)?.[1];
  const portfolioText =
    text.match(/ARG Software Portfolio\s*(.*?)(?:ARG Software Team|ARG Software Clients|ARG Software Press Mentions)/is)?.[1] ??
    '';
  const projectFacts = [
    ['Sky Tracks', 'Skytracks'],
    ['Mojaloop', 'Mojaloop'],
    ['Vector', 'Vector'],
    ['Dokutar', 'Dokutar'],
    ['TV Cine', 'TV Cine'],
    ['Royalty Flush', 'Royalty Flush'],
    ["People's Clearinghouse", "People's Clearinghouse"],
  ].flatMap(([projectName, sourceName]) => {
    const match = portfolioText.match(
      new RegExp(
        `${escapeRegExp(sourceName)}\\s+` +
          `(\\$[\\d.]+[KMB]?\\s*-\\s*\\$[\\d.]+[KMB]?)\\s+` +
          `(\\d+\\s+Months?)\\s+` +
          `(\\d{4})`,
        'i'
      )
    );
    return match
      ? [`${projectName}: budget ${match[1]}; duration ${match[2]}; year ${match[3]}.`]
      : [];
  });

  if (!hourlyRate && projectFacts.length === 0) {
    throw new Error('The DesignRush snapshot does not contain approved commercial facts');
  }

  return [
    'Approved commercial data for ARG Software.',
    hourlyRate ? `General average hourly rate: ${hourlyRate}.` : '',
    projectFacts.length > 0 ? 'Published project budget ranges and project durations:' : '',
    ...projectFacts,
    'Use a project budget range or project duration only for the named project. Do not present a general hourly rate as a project cost. Do not present ARG engagement duration as project build duration.',
    'This is internal reference data. Never name, link to, cite, or disclose its source in visitor answers.',
  ]
    .filter(Boolean)
    .join('\n');
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
        selection?.sourceKeys.includes(entry.sourceKey)
      );
    });
  }

  return entries;
}
