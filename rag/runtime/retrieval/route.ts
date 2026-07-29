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
export const CAREERS_SOURCE_TYPES: RagSourceType[] = ['careers'];
export const LOCAL_DOCUMENT_SOURCE_TYPES: RagSourceType[] = ['local_document'];
export const TRUSTED_EXTERNAL_SOURCE_TYPES: RagSourceType[] = ['external_page'];
export const DIRECT_EVIDENCE_SOURCE_TYPES: RagSourceType[] = [
  ...OFFICIAL_WEBSITE_SOURCE_TYPES,
  ...FAQ_SOURCE_TYPES,
];

const LATEST_BLOG_PATTERN =
  /\b(?:latest|newest|most recent|recent)\b.{0,50}\b(?:articles?|blog posts?|posts?)\b|\b(?:articles?|blog posts?|posts?)\b.{0,50}\b(?:latest|newest|most recent|recent)\b/i;
const PERSONAL_PRONOUN_PATTERN = /\b(?:he|she|they|him|her|his|hers|them|their|theirs)\b/i;
const BLOG_DISCOVERY_PATTERN = /\b(?:articles?|blog posts?|posts?|read(?:ing)?|writ(?:e|ing|ten))\b/i;
const CAREERS_PATTERN = /\b(?:career|careers|job|jobs|hiring|hire|apply|application|role|position|candidate|cv|resume)\b/i;
const ENGAGEMENT_DURATION_PATTERN =
  /\b(?:work(?:ed|ing)? with|collaborat(?:ed|ion|ing)? with|engagement|partnership|client relationship)\b.{0,80}\b(?:duration|timeline|how long|months?|years?|ongoing|took|last(?:ed)?)\b|\b(?:duration|timeline|how long|months?|years?|ongoing|took|last(?:ed)?)\b.{0,80}\b(?:work(?:ed|ing)? with|collaborat(?:ed|ion|ing)? with|engagement|partnership|client relationship)\b/i;
const EXTERNAL_LINK_PATTERN =
  /\b(?:github|git hub|linkedin|linked in|medium|portfolio|website|site|rss|atom|feed|email|e-mail|contact|book(?:ing)?|calendar|call|meeting|brief|form)\b.{0,50}\b(?:link|url|where|show|send|open|visit|profile|page|email|contact|book|download)?\b/i;
const GENERAL_PRICING_PATTERN =
  /\b(?:budget|cost|price|pricing|hourly|rate|minimum|starts? at|estimate|quote)\b/i;
const GENERAL_TIMELINE_PATTERN =
  /\b(?:how long|timeline|duration|delivery time|deadline|weeks?|months?|estimate)\b.{0,80}\b(?:mvp|app|application|product|platform|build|develop|deliver|launch|new project)\b|\b(?:mvp|app|application|product|platform|build|develop|deliver|launch|new project)\b.{0,80}\b(?:how long|timeline|duration|delivery time|deadline|weeks?|months?|estimate)\b/i;
const OPEN_SOURCE_PATTERN =
  /\b(?:open[-\s]?source|opensource|public repos?|repositories|github repos?|github projects?)\b/i;
const PROJECT_BUDGET_PATTERN = /\b(?:project budget|budget|cost|price|pricing)\b/i;
const PROJECT_DURATION_PATTERN =
  /\b(?:project duration|how long|timeline|duration|took|take|months?|years?|delivery time)\b/i;
const TECHNOLOGY_QUALITY_PATTERN =
  /\b(?:ai|automation|architecture|backend|ci\/cd|cicd|cloud|code review|database|devops|frontend|framework|integration tests?|language|mobile|observability|platform|qa|quality|scalability|security|stack|technology|testing|tests?|tool|unit tests?)\b/i;
const KNOWN_PROJECT_NAMES = [
  "People's Clearinghouse",
  'Royalty Flush',
  'Sky Tracks',
  'Skytracks',
  'Mojaloop',
  'Dokutar',
  'TV Cine',
  'Vector',
];

export function resolveRetrievalRoute(
  retrievalQuestion: string,
  plan: Pick<RetrievalPlan, 'mode' | 'entity' | 'subject'>
): RetrievalRoute {
  const routeText = `${retrievalQuestion} ${plan.entity} ${plan.subject}`;

  if (plan.mode === 'article_discovery') {
    return {
      kind: 'blog',
      blogKind: LATEST_BLOG_PATTERN.test(routeText) ? 'latest' : 'topic_discovery',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  const projectEntity = resolveProjectEntity(routeText, plan.entity);
  const planWithResolvedEntity = projectEntity ? { ...plan, entity: projectEntity } : plan;
  const hasProjectEntity = Boolean(projectEntity);

  if (OPEN_SOURCE_PATTERN.test(routeText)) {
    return createRoute('open_source', LOCAL_DOCUMENT_SOURCE_TYPES, plan);
  }

  if (isExternalLinkQuestion(routeText)) {
    return createRoute('link_action', ['homepage'], plan);
  }

  if (hasProjectEntity && PROJECT_BUDGET_PATTERN.test(routeText)) {
    return createCommercialRoute('project_budget', planWithResolvedEntity);
  }

  if (hasProjectEntity && ENGAGEMENT_DURATION_PATTERN.test(routeText)) {
    return createCommercialRoute('engagement_duration', planWithResolvedEntity);
  }

  if (hasProjectEntity && PROJECT_DURATION_PATTERN.test(routeText)) {
    return createCommercialRoute('project_duration', planWithResolvedEntity);
  }

  if (GENERAL_TIMELINE_PATTERN.test(routeText)) {
    return createCommercialRoute('timeline_estimate', planWithResolvedEntity);
  }

  if (GENERAL_PRICING_PATTERN.test(routeText)) {
    return createCommercialRoute('general_pricing', planWithResolvedEntity);
  }

  if (plan.mode === 'editorial') {
    return {
      kind: 'blog',
      blogKind: 'answer',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  if (PERSONAL_PRONOUN_PATTERN.test(retrievalQuestion) && !plan.entity) {
    return {
      kind: 'people',
      firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
      entity: '',
      subject: plan.subject,
      requiresPersonClarification: true,
    };
  }

  if (CAREERS_PATTERN.test(routeText)) {
    return createRoute('careers', CAREERS_SOURCE_TYPES, plan);
  }

  if (projectEntity) {
    return createRoute(
      'portfolio_work',
      ['homepage', 'project', 'partner', 'local_document'],
      planWithResolvedEntity
    );
  }

  if (TECHNOLOGY_QUALITY_PATTERN.test(routeText)) {
    return createRoute('technology_quality', DIRECT_EVIDENCE_SOURCE_TYPES, plan);
  }

  if (BLOG_DISCOVERY_PATTERN.test(routeText)) {
    return {
      kind: 'blog',
      blogKind: LATEST_BLOG_PATTERN.test(routeText) ? 'latest' : 'topic_discovery',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  if (plan.mode === 'direct_evidence') {
    return {
      kind: 'company_services',
      firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
      entity: plan.entity,
      subject: plan.subject,
    };
  }

  return {
    kind: 'company_services',
    firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
    entity: plan.entity,
    subject: plan.subject,
  };
}

function createRoute(
  kind: RetrievalRoute['kind'],
  firstPartySourceTypes: RagSourceType[] | null,
  plan: Pick<RetrievalPlan, 'entity' | 'subject'>
): RetrievalRoute {
  return {
    kind,
    firstPartySourceTypes,
    entity: plan.entity,
    subject: plan.subject,
  };
}

function createCommercialRoute(
  commercialKind: NonNullable<RetrievalRoute['commercialKind']>,
  plan: Pick<RetrievalPlan, 'entity' | 'subject'>
): RetrievalRoute {
  return {
    kind: 'commercial_delivery',
    commercialKind,
    firstPartySourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
    entity: plan.entity,
    subject: plan.subject,
  };
}

function isExternalLinkQuestion(value: string): boolean {
  return EXTERNAL_LINK_PATTERN.test(value) && !GENERAL_PRICING_PATTERN.test(value);
}

function isCompanyEntityName(value: string): boolean {
  return /\b(?:arg|arg software|company|team|studio|you|your)\b/i.test(value.trim());
}

function resolveProjectEntity(routeText: string, entity: string): string {
  if (entity && !isCompanyEntityName(entity)) {
    return entity;
  }

  const normalizedRouteText = normalizeName(routeText);
  const match = KNOWN_PROJECT_NAMES.find(projectName =>
    normalizedRouteText.includes(normalizeName(projectName))
  );

  return match ?? '';
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
