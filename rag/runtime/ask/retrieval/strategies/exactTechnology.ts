import type { RetrievedContext } from '../../../../core/types/context.js';
import type { RagConfig } from '../../../../core/types/config.js';
import type { RetrievalRoute } from '../../../../core/types/retrieval.js';
import type { RagSourceType } from '../../../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../../../repositories/RagReadRepository.js';
import { getTechnologySearchTerms, isCompanyEntity } from '../technology/normalizeTechnology.js';
import {
  getExactTechnologyPattern,
  isDisqualifyingTechnologyEvidence,
  removeIdioms,
} from '../technology/technologyEvidence.js';

const AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES: RagSourceType[] = [
  'working_with_us',
  'project',
  'faq',
  'homepage',
  'about',
];
const BLOG_TECHNOLOGY_SOURCE_TYPES: RagSourceType[] = ['blog_post'];
const SOURCE_TYPE_PRIORITY = new Map(
  AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES.map((sourceType, index) => [sourceType, index])
);

export async function retrieveLexicalExactTechnologyEvidence(
  readRepository: RagReadRepository,
  config: RagConfig,
  subject: string
): Promise<RetrievedContext[]> {
  if (!isExactTechnologySubject(subject)) {
    return [];
  }

  const contexts = await readRepository.findChunksByText({
    terms: getTechnologySearchTerms(subject),
    matchCount: Math.max(config.matchCount * 4, 20),
    sourceTypes: AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES,
  });

  return filterExactTechnologyEvidence(contexts, subject)
    .sort((left, right) => getSourcePriority(left.sourceType) - getSourcePriority(right.sourceType))
    .slice(0, config.matchCount);
}

export async function retrieveLexicalExactBlogTechnologyEvidence(
  readRepository: RagReadRepository,
  config: RagConfig,
  subject: string
): Promise<RetrievedContext[]> {
  if (!isExactTechnologySubject(subject)) {
    return [];
  }

  const contexts = await readRepository.findChunksByText({
    terms: getTechnologySearchTerms(subject),
    matchCount: Math.max(config.matchCount * 2, 12),
    sourceTypes: BLOG_TECHNOLOGY_SOURCE_TYPES,
  });

  return filterExactTechnologyEvidence(contexts, subject).slice(0, 2);
}

export function isExactTechnologySubject(subject: string): boolean {
  return Boolean(getExactTechnologyPattern(subject));
}

export function filterExactTechnologyEvidence(
  contexts: RetrievedContext[],
  subject: string
): RetrievedContext[] {
  const technologyPattern = getExactTechnologyPattern(subject);

  if (!technologyPattern) {
    return contexts;
  }

  return contexts.filter(context => {
    const content = removeIdioms(context.content);
    return technologyPattern.test(content) && !isDisqualifyingTechnologyEvidence(content, subject);
  });
}

export function shouldUseBlogTechnologyEvidence(
  route: RetrievalRoute,
  person: RagSourceRecord | null,
  entitySource: RagSourceRecord | null
): boolean {
  if (person || (entitySource && !isCompanyEntity(route.entity))) {
    return false;
  }

  return isExactTechnologySubject(route.subject) || isTechnicalWritingSubject(route.subject);
}

export function isTechnicalWritingSubject(subject: string): boolean {
  return /\b(?:architecture|architectural|pattern|patterns|methodology|methodologies|ddd|cqrs|dependency injection|result pattern|clean architecture|domain model|aggregates?)\b/iu.test(subject);
}

function getSourcePriority(sourceType: RagSourceType): number {
  return SOURCE_TYPE_PRIORITY.get(sourceType) ?? Number.MAX_SAFE_INTEGER;
}
