import type { RagSourceType } from '../sources/ragsource.types.js';
import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../routing/retrievalroute.types.js';
import { isCompanyEntity, normalizeTechnologySubject } from '../technologies/technologynames.js';
import {
  getExactTechnologyPattern,
  isDisqualifyingTechnologyEvidence,
  removeIdioms,
} from '../technologies/technologyevidence.js';

export const AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES: RagSourceType[] = [
  'working_with_us',
  'project',
  'faq',
  'homepage',
  'about',
];
export const BLOG_TECHNOLOGY_SOURCE_TYPES: RagSourceType[] = ['blog_post'];

const SOURCE_TYPE_PRIORITY = new Map(
  AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES.map((sourceType, index) => [sourceType, index])
);

export function isExactTechnologySubject(subject: string): boolean {
  return Boolean(getExactTechnologyPattern(subject));
}

export function filterExactTechnologyEvidence(
  contexts: IRetrievedContext[],
  subject: string
): IRetrievedContext[] {
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
  route: IRetrievalRoute,
  person: unknown | null,
  entitySource: unknown | null
): boolean {
  if (person || (entitySource && !isCompanyEntity(route.entity))) {
    return false;
  }

  return isExactTechnologySubject(route.subject) || isTechnicalWritingSubject(route.subject);
}

export function isTechnicalWritingSubject(subject: string): boolean {
  return /\b(?:architecture|architectural|pattern|patterns|methodology|methodologies|ddd|cqrs|dependency injection|result pattern|clean architecture|domain model|aggregates?)\b/iu.test(subject);
}

export function getTechnologySourcePriority(sourceType: RagSourceType): number {
  return SOURCE_TYPE_PRIORITY.get(sourceType) ?? Number.MAX_SAFE_INTEGER;
}

export function isTechnologySubject(subject: string): boolean {
  return Boolean(normalizeTechnologySubject(subject));
}
