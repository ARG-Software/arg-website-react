import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../routing/retrievalroute.types.js';
import { isCompanyEntity } from '../technologies/technologynames.js';
import {
  isExactTechnologySubject,
  isTechnicalWritingSubject,
  shouldUseBlogTechnologyEvidence,
} from './technologyclaims.js';

export function isCompanyOrTeamEntity(entity: string): boolean {
  return isCompanyEntity(entity) || /\b(?:company|team|studio|we|us|you|your)\b/iu.test(entity.trim());
}

export function shouldUseLexicalBlogTechnologyEvidence(
  route: IRetrievalRoute,
  person: unknown | null,
  entitySource: unknown | null
): boolean {
  return shouldUseBlogTechnologyEvidence(route, person, entitySource) && isTechnicalWritingSubject(route.subject);
}

export function isTechnicalCapabilityRoute(route: IRetrievalRoute): boolean {
  return route.kind === 'technology_quality' || isExactTechnologySubject(route.subject);
}

export function filterIndividualContextsForCompanyLevelQuestion(
  contexts: IRetrievedContext[],
  excludeNamedIndividualContent = false
): IRetrievedContext[] {
  return contexts.filter(
    context => !isIndividualEvidenceContext(context, excludeNamedIndividualContent)
  );
}

export function isIndividualEvidenceContext(
  context: IRetrievedContext,
  excludeNamedIndividualContent: boolean
): boolean {
  const evidenceScope = context.sourceMetadata.evidence_scope;
  return (
    typeof context.sourceMetadata.person_key === 'string' ||
    (typeof evidenceScope === 'string' && evidenceScope.startsWith('individual_')) ||
    (excludeNamedIndividualContent && isNamedAboutContent(context))
  );
}

export function isNamedAboutContent(context: IRetrievedContext): boolean {
  if (context.sourceType !== 'about') {
    return false;
  }

  if (context.sourceKey === 'arg-team' || context.sourceKey === 'arg-team-capabilities') {
    return false;
  }

  return /(?:jose|josé|rui)/iu.test(context.content);
}
