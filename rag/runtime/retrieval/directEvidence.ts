import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingProvider, RetrievedContext } from '../../types/ai.js';
import type { RagConfig } from '../../types/config.js';
import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../../types/source.js';
import { createQueryEmbedding } from './embeddings.js';
import {
  BLOG_SOURCE_TYPES,
  DIRECT_EVIDENCE_SOURCE_TYPES,
  FAQ_SOURCE_TYPES,
  OFFICIAL_WEBSITE_SOURCE_TYPES,
  TRUSTED_EXTERNAL_SOURCE_TYPES,
  type RetrievalRoute,
} from './route.js';
import { retrieveFirstChunksForSources, retrieveSources } from './sources.js';
import type { DirectSourceRow, MatchFunction } from './types.js';
import { mergeComplementaryContexts, retrieveContextsForOrigin } from './vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';
const TRUSTED_EXTERNAL_ORIGIN = 'trusted_external';
const BROAD_PERSON_PROFILE_PATTERN =
  /\b(?:background|bio|biography|career|education|experience|profile|stud(?:y|ies)|who is|tell me about)\b/iu;
const PROFESSIONAL_BACKGROUND_PATTERN =
  /\b(?:background|career|education|experience|professional|stud(?:y|ies)|work)\b/iu;
const COMPANY_ORIGIN_PATTERN = /\b(?:founded|founder|origin|started|start|began|begin|created)\b/iu;
const EXACT_TECHNOLOGY_PATTERNS: Array<{ names: string[]; pattern: RegExp }> = [
  { names: ['go', 'go language', 'golang', 'golang language'], pattern: /\b(?:go|golang)\b/iu },
  { names: ['c#', 'c sharp', 'csharp'], pattern: /(?:^|[^a-z0-9])c#(?=$|[^a-z0-9])/iu },
  { names: ['python', 'python language'], pattern: /\bpython\b/iu },
  { names: ['typescript', 'typescript language'], pattern: /\btypescript\b/iu },
  { names: ['javascript', 'javascript language'], pattern: /\bjavascript\b/iu },
];
const TECHNOLOGY_CATEGORY_WORD_PATTERN =
  /\b(?:cloud|database|framework|language|library|methodology|platform|programming|stack|technology|tool)\b/giu;
const NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN =
  /\b(?:automated\s+tests?|background|budget|career|ci\/cd|cicd|code\s+reviews?|contact|continuous\s+(?:delivery|integration)|cost|duration|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|experience|fintech|integration\s+tests?|origin|price|project|qa|quality\s+assurance|service|team|test\s+coverage|testing|unit\s+tests?)\b/iu;

interface SemanticSearchInput {
  query: string;
  embedding: number[];
  matchFunction: MatchFunction;
}

export async function retrieveDirectEvidenceContexts({
  supabase,
  config,
  route,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  supabase: SupabaseClient;
  config: RagConfig;
  route: RetrievalRoute;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  const person = route.entity ? await findPersonSource(supabase, route.entity) : null;

  if (person && route.subject && isBroadPersonProfileSubject(route.subject)) {
    return retrieveBroadPersonProfileContexts({
      supabase,
      config,
      person,
      subject: route.subject,
      embeddingProvider,
      fallbackEmbeddingProvider,
      semanticSearch,
    });
  }

  if (!route.subject && route.entity) {
    const entitySource = person ?? (await findDirectSource(supabase, route.entity));
    return entitySource ? retrieveFirstChunksForSources(supabase, config, [entitySource]) : [];
  }

  const search = route.subject
    ? await resolveSemanticSearch(
        route.subject,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch
      )
    : null;
  const personalEvidence = person && search
    ? await retrievePersonSemanticEvidence(supabase, config, person, search)
    : [];
  const entitySource = !person && route.entity ? await findDirectSource(supabase, route.entity) : null;
  const isCompanyQuestion = isCompanyEntity(route.entity);
  const entityEvidence = entitySource && search
    ? await retrieveSemanticEvidenceForSourceKeys(supabase, config, search, [entitySource.source_key])
    : [];

  if (route.entity && !person && !entitySource && !isCompanyQuestion) {
    return [];
  }

  if (entitySource && !isCompanyQuestion) {
    return entityEvidence;
  }

  const officialEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        supabase,
        config,
        search,
        OFFICIAL_WEBSITE_SOURCE_TYPES,
        FIRST_PARTY_ORIGIN
      )
    : [];
  const faqEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        supabase,
        config,
        search,
        FAQ_SOURCE_TYPES,
        FIRST_PARTY_ORIGIN
      )
    : [];
  const trustedExternalEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        supabase,
        config,
        search,
        TRUSTED_EXTERNAL_SOURCE_TYPES,
        TRUSTED_EXTERNAL_ORIGIN
      )
    : [];
  const blogTechnologyEvidence = shouldUseBlogTechnologyEvidence(route, person, entitySource) && search
    ? await retrieveSemanticEvidenceForOrigin(
        supabase,
        config,
        search,
        BLOG_SOURCE_TYPES,
        FIRST_PARTY_ORIGIN
      )
    : [];
  const mergedContextLimit = isExactTechnologySubject(route.subject)
    ? Number.MAX_SAFE_INTEGER
    : config.matchCount;
  const directEvidence = mergePrioritizedContexts(
    [
      personalEvidence,
      entityEvidence,
      officialEvidence,
      faqEvidence,
      trustedExternalEvidence,
      blogTechnologyEvidence,
    ],
    mergedContextLimit
  );
  const exactTechnologyEvidence = filterExactTechnologyEvidence(directEvidence, route.subject).slice(
    0,
    config.matchCount
  );

  if (isExactTechnologySubject(route.subject)) {
    return exactTechnologyEvidence;
  }

  if (person || exactTechnologyEvidence.length > 0) {
    return exactTechnologyEvidence;
  }

  return retrieveSemanticEvidence(
    supabase,
    config,
    route.subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
}

async function findPersonSource(
  supabase: SupabaseClient,
  entity: string
): Promise<DirectSourceRow | null> {
  const sources = await retrieveSources(supabase, ['about']);
  const people = sources.filter(source => getPersonKey(source.metadata));
  const entityName = normalizeEntityName(entity);
  const matches = people.filter(source => normalizeEntityName(source.title) === entityName);

  if (matches.length === 1) {
    return matches[0];
  }

  const firstNameMatches = people.filter(source =>
    normalizeEntityName(source.title).split(' ')[0] === entityName
  );
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}

async function findDirectSource(
  supabase: SupabaseClient,
  entity: string
): Promise<DirectSourceRow | null> {
  const entityName = normalizeEntityName(entity);
  const matches = (await retrieveSources(supabase, DIRECT_EVIDENCE_SOURCE_TYPES)).filter(
    source => normalizeEntityName(source.title) === entityName
  );
  return matches.length === 1 ? matches[0] : null;
}

async function findPersonDocuments(
  supabase: SupabaseClient,
  person: DirectSourceRow
): Promise<DirectSourceRow[]> {
  const personKey = getPersonKey(person.metadata);
  if (!personKey) {
    return [];
  }

  return (await retrieveSources(supabase, ['local_document'])).filter(
    source => source.metadata?.person_key === personKey
  );
}

async function retrieveBroadPersonProfileContexts({
  supabase,
  config,
  person,
  subject,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  supabase: SupabaseClient;
  config: RagConfig;
  person: DirectSourceRow;
  subject: string;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  const sources = [person];

  if (asksCompanyOrigin(subject)) {
    const aboutSource = await findAboutSource(supabase);
    if (aboutSource) {
      sources.push(aboutSource);
    }
  }

  if (asksProfessionalBackground(subject)) {
    sources.push(...(await findPersonDocuments(supabase, person)));
  }

  const uniqueProfileSources = uniqueSources(sources);
  const search = await resolveSemanticSearch(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
  const semanticContexts = await retrieveSemanticEvidenceForSourceKeys(
    supabase,
    config,
    search,
    uniqueProfileSources.map(source => source.source_key)
  );
  const anchorContexts = await retrieveFirstChunksForSources(supabase, config, uniqueProfileSources);

  return mergeComplementaryContexts([semanticContexts, anchorContexts], config.matchCount);
}

async function findAboutSource(supabase: SupabaseClient): Promise<DirectSourceRow | null> {
  const sources = await retrieveSources(supabase, ['about']);
  return sources.find(source => source.source_key === 'about') ?? null;
}

async function retrieveSemanticEvidence(
  supabase: SupabaseClient,
  config: RagConfig,
  subject: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider,
  semanticSearch?: SemanticSearchInput
): Promise<RetrievedContext[]> {
  if (!subject) {
    return [];
  }

  const search = await resolveSemanticSearch(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
  const officialEvidence = await retrieveSemanticEvidenceForOrigin(
    supabase,
    config,
    search,
    OFFICIAL_WEBSITE_SOURCE_TYPES,
    FIRST_PARTY_ORIGIN
  );
  const faqEvidence = await retrieveSemanticEvidenceForOrigin(
    supabase,
    config,
    search,
    FAQ_SOURCE_TYPES,
    FIRST_PARTY_ORIGIN
  );
  const trustedExternalEvidence = await retrieveSemanticEvidenceForOrigin(
    supabase,
    config,
    search,
    TRUSTED_EXTERNAL_SOURCE_TYPES,
    TRUSTED_EXTERNAL_ORIGIN
  );

  return mergePrioritizedContexts(
    [officialEvidence, faqEvidence, trustedExternalEvidence],
    config.matchCount
  );
}

async function retrievePersonSemanticEvidence(
  supabase: SupabaseClient,
  config: RagConfig,
  person: DirectSourceRow,
  search: SemanticSearchInput
): Promise<RetrievedContext[]> {
  const documents = await findPersonDocuments(supabase, person);
  return retrieveSemanticEvidenceForSourceKeys(
    supabase,
    config,
    search,
    [person, ...documents].map(source => source.source_key)
  );
}

async function retrieveSemanticEvidenceForSourceKeys(
  supabase: SupabaseClient,
  config: RagConfig,
  search: SemanticSearchInput,
  sourceKeys: string[]
): Promise<RetrievedContext[]> {
  if (sourceKeys.length === 0) {
    return [];
  }

  return retrieveContextsForOrigin({
    supabase,
    embedding: search.embedding,
    config,
    matchFunction: search.matchFunction,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceKeys,
  });
}

async function retrieveSemanticEvidenceForOrigin(
  supabase: SupabaseClient,
  config: RagConfig,
  search: SemanticSearchInput,
  sourceTypes: RagSourceType[],
  sourceOrigin: RagSourceOrigin
): Promise<RetrievedContext[]> {
  return retrieveContextsForOrigin({
    supabase,
    embedding: search.embedding,
    config,
    matchFunction: search.matchFunction,
    sourceOrigin,
    sourceTypes,
  });
}

async function resolveSemanticSearch(
  query: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider,
  semanticSearch?: SemanticSearchInput
): Promise<SemanticSearchInput> {
  if (semanticSearch) {
    return semanticSearch;
  }

  const { embedding, matchFunction } = await createQueryEmbedding(
    query,
    embeddingProvider,
    fallbackEmbeddingProvider
  );

  return { query, embedding, matchFunction };
}

function mergePrioritizedContexts(
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const contextsByChunk = new Map<string, RetrievedContext>();

  for (const context of contextGroups.flat()) {
    if (!contextsByChunk.has(context.chunkId)) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}

function filterExactTechnologyEvidence(
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

function isExactTechnologySubject(subject: string): boolean {
  return Boolean(getExactTechnologyPattern(subject));
}

function getExactTechnologyPattern(subject: string): RegExp | null {
  const normalizedSubject = normalizeTechnologySubject(subject);
  const technology = EXACT_TECHNOLOGY_PATTERNS.find(item => item.names.includes(normalizedSubject));

  if (technology) {
    return technology.pattern;
  }

  if (!isLikelyExactTechnologySubject(normalizedSubject)) {
    return null;
  }

  return createExactTermPattern(normalizedSubject);
}

function normalizeTechnologySubject(subject: string): string {
  return subject
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(TECHNOLOGY_CATEGORY_WORD_PATTERN, ' ')
    .replace(/[^a-z0-9#+. ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function isLikelyExactTechnologySubject(normalizedSubject: string): boolean {
  if (!normalizedSubject || normalizedSubject.length > 40) {
    return false;
  }

  if (NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN.test(normalizedSubject)) {
    return false;
  }

  return normalizedSubject.split(' ').length <= 3;
}

function createExactTermPattern(normalizedSubject: string): RegExp {
  const escapedTerms = normalizedSubject
    .split(' ')
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));

  return new RegExp(`(?:^|[^a-z0-9])${escapedTerms.join('\\s+')}(?=$|[^a-z0-9])`, 'iu');
}

function removeIdioms(content: string): string {
  return content.replace(/\bgo[-\s]+to\b/giu, '');
}

function isDisqualifyingTechnologyEvidence(content: string, subject: string): boolean {
  const normalizedSubject = normalizeTechnologySubject(subject);

  if (normalizedSubject !== 'go' && normalizedSubject !== 'golang') {
    return false;
  }

  return (
    /\bnot evidence\b.{0,120}\b(?:uses?|using)\b.{0,40}\b(?:go|golang)\b/iu.test(content) ||
    /\bdo not say\b.{0,120}\b(?:uses?|using)\b.{0,40}\b(?:go|golang)\b/iu.test(content) ||
    /\bonly claim existing use\b.{0,120}\b(?:go|golang)\b/iu.test(content)
  );
}

function shouldUseBlogTechnologyEvidence(
  route: RetrievalRoute,
  person: DirectSourceRow | null,
  entitySource: DirectSourceRow | null
): boolean {
  if (person || (entitySource && !isCompanyEntity(route.entity))) {
    return false;
  }

  return isExactTechnologySubject(route.subject);
}

function isBroadPersonProfileSubject(subject: string): boolean {
  return BROAD_PERSON_PROFILE_PATTERN.test(subject);
}

function asksProfessionalBackground(subject: string): boolean {
  return PROFESSIONAL_BACKGROUND_PATTERN.test(subject);
}

function asksCompanyOrigin(subject: string): boolean {
  return COMPANY_ORIGIN_PATTERN.test(subject);
}

function uniqueSources(sources: DirectSourceRow[]): DirectSourceRow[] {
  const seen = new Set<string>();
  return sources.filter(source => {
    if (seen.has(source.id)) {
      return false;
    }

    seen.add(source.id);
    return true;
  });
}

function getPersonKey(metadata: RagSourceMetadata | null | undefined): string | null {
  return typeof metadata?.person_key === 'string' ? metadata.person_key : null;
}

function isCompanyEntity(entity: string): boolean {
  const normalizedEntity = normalizeEntityName(entity);
  return normalizedEntity === 'arg' || normalizedEntity === 'arg software';
}

function normalizeEntityName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}
