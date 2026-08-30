import { flattenJsonToText } from '../extractors/flattenjson.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IPartnersJson } from '../sitedata.types.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

export async function loadPartnerSources(rootDir: string, relativeFilePath: string): Promise<IRagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const partners = await readJsonFile<IPartnersJson>(filePath);

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
