import type { RagConfig } from '../../../../core/types/config.js';
import type { RetrievedContext } from '../../../../core/types/context.js';
import type { CommercialDeliveryKind, RetrievalRoute } from '../../../../core/types/retrieval.js';
import type { RagSourceType } from '../../../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../../../repositories/RagReadRepository.js';
import { normalizeName } from '../../../../shared/text.js';

const DESIGNRUSH_SOURCE_KEY = 'designrush';
const FAQ_SOURCE_KEY = 'faq';
const TRUSTED_EXTERNAL_SOURCE_TYPES: RagSourceType[] = ['external_page'];

export async function retrieveCommercialDeliveryContexts({
  readRepository,
  config,
  route,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  route: RetrievalRoute;
}): Promise<RetrievedContext[]> {
  switch (route.commercialKind) {
    case 'project_budget':
    case 'project_duration':
      return findCommercialFactContexts(readRepository, route);
    case 'engagement_duration':
      return findEngagementDurationContexts(readRepository, route);
    case 'timeline_estimate':
      return findFaqContexts(readRepository, config, ['Most focused MVPs', '8 to 14 weeks']);
    case 'general_pricing':
    default:
      return findFaqContexts(readRepository, config, ['Project budgets usually start', 'EUR 10,000']);
  }
}

async function findCommercialFactContexts(
  readRepository: RagReadRepository,
  route: RetrievalRoute
): Promise<RetrievedContext[]> {
  const designRush = await findTrustedExternalSource(readRepository, DESIGNRUSH_SOURCE_KEY);
  const contexts = designRush ? await readRepository.findFirstChunksForSources([designRush]) : [];
  const projectName = route.entity.trim();

  if (!projectName) {
    return contexts;
  }

  return contexts.filter(context => hasNamedCommercialFact(context.content, projectName, route.commercialKind));
}

async function findEngagementDurationContexts(
  readRepository: RagReadRepository,
  route: RetrievalRoute
): Promise<RetrievedContext[]> {
  const source = await findFirstPartySourceByTitle(readRepository, route.entity, ['project', 'partner']);
  return source ? readRepository.findFirstChunksForSources([source]) : [];
}

async function findFaqContexts(
  readRepository: RagReadRepository,
  config: RagConfig,
  terms: string[]
): Promise<RetrievedContext[]> {
  const matchingChunks = await readRepository.findChunksByText({
    terms,
    matchCount: config.matchCount,
    sourceTypes: ['faq'],
  });

  if (matchingChunks.length > 0) {
    return matchingChunks;
  }

  const source = await findFirstPartySourceByKey(readRepository, FAQ_SOURCE_KEY, ['faq']);
  return source ? readRepository.findFirstChunksForSources([source]) : [];
}

async function findTrustedExternalSource(
  readRepository: RagReadRepository,
  sourceKey: string
): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({
    sourceTypes: TRUSTED_EXTERNAL_SOURCE_TYPES,
    sourceOrigin: 'trusted_external',
  });

  return sources.find(source => source.sourceKey === sourceKey) ?? null;
}

async function findFirstPartySourceByKey(
  readRepository: RagReadRepository,
  sourceKey: string,
  sourceTypes: RagSourceType[]
): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({ sourceTypes });
  return sources.find(source => source.sourceKey === sourceKey) ?? null;
}

async function findFirstPartySourceByTitle(
  readRepository: RagReadRepository,
  title: string,
  sourceTypes: RagSourceType[]
): Promise<RagSourceRecord | null> {
  const normalizedTitle = normalizeName(title);
  const sources = await readRepository.findSources({ sourceTypes });
  const matches = sources.filter(
    source =>
      normalizeName(source.title) === normalizedTitle || normalizeName(source.sourceKey) === normalizedTitle
  );

  return matches.length === 1 ? matches[0] : null;
}

function hasNamedCommercialFact(
  content: string,
  projectName: string,
  commercialKind: CommercialDeliveryKind | undefined
): boolean {
  const projectLine = content
    .split('\n')
    .find(line => normalizeName(line).startsWith(`${normalizeName(projectName)} `));

  if (!projectLine) {
    return false;
  }

  if (commercialKind === 'project_budget') {
    return /\bbudget\s+\$[\d.]+[KMB]?\s*-\s*\$[\d.]+[KMB]?/i.test(projectLine);
  }

  if (commercialKind === 'project_duration') {
    return /\bduration\s+\d+\s+months?\b/i.test(projectLine);
  }

  return true;
}
