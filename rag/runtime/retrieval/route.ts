import type { RetrievalPlan, RetrievalRoute } from '../../core/types/retrieval.js';
import type { RagSourceType } from '../../core/types/source.js';

export type { RetrievalRoute, RetrievalRouteKind } from '../../core/types/retrieval.js';

export const BLOG_SOURCE_TYPES: RagSourceType[] = ['blog_post'];
export const OFFICIAL_WEBSITE_SOURCE_TYPES: RagSourceType[] = [
  'homepage',
  'about',
  'project',
  'partner',
  'careers',
  'working_with_us',
];
export const FAQ_SOURCE_TYPES: RagSourceType[] = ['faq'];
export const TRUSTED_EXTERNAL_SOURCE_TYPES: RagSourceType[] = ['external_page'];
export const DIRECT_EVIDENCE_SOURCE_TYPES: RagSourceType[] = [
  ...OFFICIAL_WEBSITE_SOURCE_TYPES,
  ...FAQ_SOURCE_TYPES,
];

const LATEST_BLOG_PATTERN =
  /\b(?:latest|newest|most recent|recent)\b.{0,50}\b(?:articles?|blog posts?|posts?)\b|\b(?:articles?|blog posts?|posts?)\b.{0,50}\b(?:latest|newest|most recent|recent)\b/i;
const PERSONAL_PRONOUN_PATTERN = /\b(?:he|she|they|him|her|his|hers|them|their|theirs)\b/i;

export function resolveRetrievalRoute(
  retrievalQuestion: string,
  plan: Pick<RetrievalPlan, 'mode' | 'entity' | 'subject'>
): RetrievalRoute {
  if (plan.mode === 'article_discovery' && LATEST_BLOG_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'latest_blog',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  if (PERSONAL_PRONOUN_PATTERN.test(retrievalQuestion) && !plan.entity) {
    return {
      kind: 'direct_evidence',
      firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
      entity: '',
      subject: plan.subject,
      requiresPersonClarification: true,
    };
  }

  if (plan.mode === 'direct_evidence') {
    return {
      kind: 'direct_evidence',
      firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  return {
    kind: 'editorial',
    firstPartySourceTypes: BLOG_SOURCE_TYPES,
    entity: plan.entity,
    subject: plan.subject,
  };
}
