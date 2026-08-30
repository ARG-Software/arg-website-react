import path from 'node:path';

import { flattenJsonToText } from '../extractors/flattenjson.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import { HOMEPAGE_SECTION_SCOPES } from '../../../application/config/sourcecatalog.config.js';
import type { ISiteLinksJson } from '../sitedata.types.js';
import type { IInlineJsonManifestEntry, IJsonManifestEntry } from '../sourcemanifest.types.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

export async function loadHomepageSectionSources(
  rootDir: string,
  entry: IJsonManifestEntry
): Promise<IRagSource[]> {
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

export async function loadJsonSource(filePath: string, options: IJsonManifestEntry): Promise<IRagSource> {
  const sourceKey = options.sourceKey ?? path.basename(filePath, path.extname(filePath));
  const json = await readJsonFile(filePath);
  const sourceJson = options.dataKey ? (json as Record<string, unknown>)[options.dataKey] : json;
  const content =
    sourceKey === 'site-links'
      ? formatSiteLinksSource(sourceJson as ISiteLinksJson, options.label)
      : flattenJsonToText(sourceJson, options.label);

  return createSource({
    sourceType: options.sourceType,
    sourceKey,
    title: options.title ?? sourceKey,
    url: options.url,
    path: filePath,
    metadata: {
      ...(options.metadata ?? {}),
      source_file: filePath,
      ...(options.dataKey ? { data_key: options.dataKey } : {}),
    },
    content,
  });
}

export function loadInlineJsonSource(rootDir: string, options: IInlineJsonManifestEntry): IRagSource {
  const virtualPath = resolveRoot(rootDir, options.virtualPath);

  return createSource({
    sourceType: options.sourceType,
    sourceKey: options.sourceKey,
    title: options.title,
    url: options.url,
    path: virtualPath,
    metadata: { ...(options.metadata ?? {}), source_file: virtualPath },
    content: flattenJsonToText(options.content, options.label),
  });
}

function formatSiteLinksSource(siteLinks: ISiteLinksJson, label = 'ARG links and contact options'): string {
  return [
    `${label}: Visitors can send a message through Gaspar here in the assistant.`,
    `${label}: Primary general email: ${siteLinks.emails?.hello}.`,
    `${label}: Book a meeting: ${siteLinks.calendar?.project}.`,
    `${label}: Contact form and project brief: ${siteLinks.forms?.projectBrief}.`,
    `${label}: GitHub: ${siteLinks.socials?.github}.`,
    `${label}: LinkedIn: ${siteLinks.socials?.linkedin}.`,
    `${label}: Medium: ${siteLinks.socials?.medium}.`,
    `${label}: Portfolio: ${siteLinks.assets?.portfolio}.`,
    `${label}: RSS feed: ${siteLinks.feeds?.rss}.`,
    `${label}: Atom feed: ${siteLinks.feeds?.atom}.`,
  ]
    .filter(line => !line.endsWith(': undefined.'))
    .join('\n');
}
