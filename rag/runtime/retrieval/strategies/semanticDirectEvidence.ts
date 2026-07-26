import type { RagConfig } from '../../../core/types/config.js';
import type { RetrievedContext } from '../../../core/types/context.js';
import type { EmbeddingProvider } from '../../../core/types/providers.js';
import type { RetrievalRoute } from '../../../core/types/retrieval.js';
import type { RagSourceOrigin, RagSourceType } from '../../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../../repositories/RagReadRepository.js';
import { resolveSemanticSearch, type SemanticSearchInput } from '../embeddings.js';
import {
  BLOG_SOURCE_TYPES,
  DIRECT_EVIDENCE_SOURCE_TYPES,
  FAQ_SOURCE_TYPES,
  OFFICIAL_WEBSITE_SOURCE_TYPES,
  TRUSTED_EXTERNAL_SOURCE_TYPES,
} from '../route.js';
import { isCompanyEntity, normalizeName } from '../technology/normalizeTechnology.js';
import { retrieveContextsForOrigin } from '../vectorSearch.js';
import {
  filterExactTechnologyEvidence,
  isExactTechnologySubject,
  retrieveLexicalExactTechnologyEvidence,
  shouldUseBlogTechnologyEvidence,
} from './exactTechnology.js';
import {
  findPersonSource,
  isBroadPersonProfileSubject,
  retrieveBroadPersonProfileContexts,
  retrievePersonSemanticEvidence,
} from './personProfile.js';
import {
  isProjectReferenceQuestion,
  retrieveProjectReferenceContexts,
} from './projectReferences.js';

const FIRST_PARTY_ORIGIN = 'first_party';
const TRUSTED_EXTERNAL_ORIGIN = 'trusted_external';

export async function retrieveDirectEvidenceContexts({
  readRepository,
  config,
  retrievalQuestion,
  route,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  retrievalQuestion: string;
  route: RetrievalRoute;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  if (isProjectReferenceQuestion(retrievalQuestion, route.subject)) {
    return retrieveProjectReferenceContexts({
      readRepository,
      config,
      question: retrievalQuestion,
      subject: route.subject,
    });
  }

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

  const entitySource =
    !person && route.entity ? await findDirectSource(readRepository, route.entity) : null;
  const isCompanyQuestion = isCompanyEntity(route.entity);

  if (route.subject && !person && (!entitySource || isCompanyQuestion)) {
    const lexicalExactTechnologyEvidence = await retrieveLexicalExactTechnologyEvidence(
      readRepository,
      config,
      route.subject
    );

    if (lexicalExactTechnologyEvidence.length > 0) {
      return lexicalExactTechnologyEvidence;
    }
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
  const entityEvidence = entitySource && search
    ? await retrieveSemanticEvidenceForSourceKeys(readRepository, config, search, [
        entitySource.sourceKey,
      ])
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
  const blogTechnologyEvidence =
    shouldUseBlogTechnologyEvidence(route, person, entitySource) && search
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
  const exactTechnologyEvidence = filterExactTechnologyEvidence(
    directEvidence,
    route.subject
  ).slice(0, config.matchCount);

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

async function findDirectSource(
  readRepository: RagReadRepository,
  entity: string
): Promise<RagSourceRecord | null> {
  const entityName = normalizeName(entity);
  const sources = await readRepository.findSources({
    sourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
  });
  const matches = sources.filter(source => normalizeName(source.title) === entityName);
  return matches.length === 1 ? matches[0] : null;
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
