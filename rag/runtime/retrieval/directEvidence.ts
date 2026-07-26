import type { RagConfig } from '../../core/types/config.js';
import type { RetrievedContext } from '../../core/types/context.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { EmbeddingIndex, RetrievalRoute } from '../../core/types/retrieval.js';
import type {
  RagSourceMetadata,
  RagSourceOrigin,
  RagSourceType,
} from '../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../repositories/RagReadRepository.js';
import { createQueryEmbedding } from './embeddings.js';
import {
  BLOG_SOURCE_TYPES,
  DIRECT_EVIDENCE_SOURCE_TYPES,
  FAQ_SOURCE_TYPES,
  OFFICIAL_WEBSITE_SOURCE_TYPES,
  TRUSTED_EXTERNAL_SOURCE_TYPES,
} from './route.js';
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
  index: EmbeddingIndex;
}

export async function retrieveDirectEvidenceContexts({
  readRepository,
  config,
  route,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  route: RetrievalRoute;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  const person = route.entity ? await findPersonSource(readRepository, route.entity) : null;

  if (person && route.subject && isBroadPersonProfileSubject(route.subject)) {
    return retrieveBroadPersonProfileContexts({
      readRepository,
      config,
      person,
      subject: route.subject,
      embeddingProvider,
      fallbackEmbeddingProvider,
      semanticSearch,
    });
  }

  if (!route.subject && route.entity) {
    const entitySource = person ?? (await findDirectSource(readRepository, route.entity));
    return entitySource ? readRepository.findFirstChunksForSources([entitySource]) : [];
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
    ? await retrievePersonSemanticEvidence(readRepository, config, person, search)
    : [];
  const entitySource = !person && route.entity ? await findDirectSource(readRepository, route.entity) : null;
  const isCompanyQuestion = isCompanyEntity(route.entity);
  const entityEvidence = entitySource && search
    ? await retrieveSemanticEvidenceForSourceKeys(readRepository, config, search, [entitySource.sourceKey])
    : [];

  if (route.entity && !person && !entitySource && !isCompanyQuestion) {
    return [];
  }

  if (entitySource && !isCompanyQuestion) {
    return entityEvidence;
  }

  const officialEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        readRepository,
        config,
        search,
        OFFICIAL_WEBSITE_SOURCE_TYPES,
        FIRST_PARTY_ORIGIN
      )
    : [];
  const faqEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        readRepository,
        config,
        search,
        FAQ_SOURCE_TYPES,
        FIRST_PARTY_ORIGIN
      )
    : [];
  const trustedExternalEvidence = search
    ? await retrieveSemanticEvidenceForOrigin(
        readRepository,
        config,
        search,
        TRUSTED_EXTERNAL_SOURCE_TYPES,
        TRUSTED_EXTERNAL_ORIGIN
      )
    : [];
  const blogTechnologyEvidence = shouldUseBlogTechnologyEvidence(route, person, entitySource) && search
    ? await retrieveSemanticEvidenceForOrigin(
        readRepository,
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
    readRepository,
    config,
    route.subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
}

async function findPersonSource(
  readRepository: RagReadRepository,
  entity: string
): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({ sourceTypes: ['about'] });
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
  readRepository: RagReadRepository,
  entity: string
): Promise<RagSourceRecord | null> {
  const entityName = normalizeEntityName(entity);
  const sources = await readRepository.findSources({
    sourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
  });
  const matches = sources.filter(source => normalizeEntityName(source.title) === entityName);
  return matches.length === 1 ? matches[0] : null;
}

async function findPersonDocuments(
  readRepository: RagReadRepository,
  person: RagSourceRecord
): Promise<RagSourceRecord[]> {
  const personKey = getPersonKey(person.metadata);
  if (!personKey) {
    return [];
  }

  const documents = await readRepository.findSources({ sourceTypes: ['local_document'] });
  return documents.filter(source => source.metadata?.person_key === personKey);
}

async function retrieveBroadPersonProfileContexts({
  readRepository,
  config,
  person,
  subject,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  person: RagSourceRecord;
  subject: string;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  const sources = [person];

  if (asksCompanyOrigin(subject)) {
    const aboutSource = await findAboutSource(readRepository);
    if (aboutSource) {
      sources.push(aboutSource);
    }
  }

  if (asksProfessionalBackground(subject)) {
    sources.push(...(await findPersonDocuments(readRepository, person)));
  }

  const uniqueProfileSources = uniqueSources(sources);
  const search = await resolveSemanticSearch(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
  const semanticContexts = await retrieveSemanticEvidenceForSourceKeys(
    readRepository,
    config,
    search,
    uniqueProfileSources.map(source => source.sourceKey)
  );
  const anchorContexts = await readRepository.findFirstChunksForSources(uniqueProfileSources);

  return mergeComplementaryContexts([semanticContexts, anchorContexts], config.matchCount);
}

async function findAboutSource(readRepository: RagReadRepository): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({ sourceTypes: ['about'] });
  return sources.find(source => source.sourceKey === 'about') ?? null;
}

async function retrieveSemanticEvidence(
  readRepository: RagReadRepository,
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
    readRepository,
    config,
    search,
    OFFICIAL_WEBSITE_SOURCE_TYPES,
    FIRST_PARTY_ORIGIN
  );
  const faqEvidence = await retrieveSemanticEvidenceForOrigin(
    readRepository,
    config,
    search,
    FAQ_SOURCE_TYPES,
    FIRST_PARTY_ORIGIN
  );
  const trustedExternalEvidence = await retrieveSemanticEvidenceForOrigin(
    readRepository,
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
  readRepository: RagReadRepository,
  config: RagConfig,
  person: RagSourceRecord,
  search: SemanticSearchInput
): Promise<RetrievedContext[]> {
  const documents = await findPersonDocuments(readRepository, person);
  return retrieveSemanticEvidenceForSourceKeys(
    readRepository,
    config,
    search,
    [person, ...documents].map(source => source.sourceKey)
  );
}

async function retrieveSemanticEvidenceForSourceKeys(
  readRepository: RagReadRepository,
  config: RagConfig,
  search: SemanticSearchInput,
  sourceKeys: string[]
): Promise<RetrievedContext[]> {
  if (sourceKeys.length === 0) {
    return [];
  }

  return retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceKeys,
  });
}

async function retrieveSemanticEvidenceForOrigin(
  readRepository: RagReadRepository,
  config: RagConfig,
  search: SemanticSearchInput,
  sourceTypes: RagSourceType[],
  sourceOrigin: RagSourceOrigin
): Promise<RetrievedContext[]> {
  return retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
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

  const { embedding, index } = await createQueryEmbedding(
    query,
    embeddingProvider,
    fallbackEmbeddingProvider
  );

  return { query, embedding, index };
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
  person: RagSourceRecord | null,
  entitySource: RagSourceRecord | null
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

function uniqueSources(sources: RagSourceRecord[]): RagSourceRecord[] {
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
