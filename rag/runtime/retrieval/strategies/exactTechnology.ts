import type { RetrievedContext } from '../../../core/types/context.js';
import type { RetrievalRoute } from '../../../core/types/retrieval.js';
import type { RagSourceRecord } from '../../../repositories/RagReadRepository.js';
import { isCompanyEntity } from '../technology/normalizeTechnology.js';
import {
  getExactTechnologyPattern,
  isDisqualifyingTechnologyEvidence,
  removeIdioms,
} from '../technology/technologyEvidence.js';

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

  return isExactTechnologySubject(route.subject);
}
