import type { IRagConfig } from '../../../config/IRagConfiguration.js';
import type { IRetrievedContext } from '../../../../domain/retrieval/IRetrievedContext.js';
import type { IEmbeddingProvider } from '../../../ports/IProviderPorts.js';
import type { IRetrievalRoute } from '../../../../domain/retrieval/IRetrievalRoute.js';
import type { RagSourceOrigin, RagSourceType } from '../../../../domain/content/IRagSource.js';
import type { IRagReadRepository, IRagSourceRecord } from '../../../ports/IRagReadRepository.js';
import { resolveSemanticSearch, type ISemanticSearchInput } from '../embeddings.js';
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
  retrieveLexicalExactBlogTechnologyEvidence,
  retrieveLexicalExactTechnologyEvidence,
  shouldUseBlogTechnologyEvidence,
  isTechnicalWritingSubject,
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
  readRepository: IRagReadRepository;
  config: IRagConfig;
  retrievalQuestion: string;
  route: IRetrievalRoute;
  embeddingProvider: IEmbeddingProvider;
  fallbackEmbeddingProvider: IEmbeddingProvider;
  semanticSearch?: ISemanticSearchInput;
}): Promise<IRetrievedContext[]> {
  if (isProjectReferenceQuestion(retrievalQuestion, route.subject)) {
    return retrieveProjectReferenceContexts({
      readRepository,
      config,
      question: retrievalQuestion,
      subject: route.subject,
    });
  }

  if (route.sourceKeys?.length && route.subject) {
    const search = await resolveSemanticSearch(
      route.subject,
      embeddingProvider,
      fallbackEmbeddingProvider,
      semanticSearch
    );

    return retrieveSemanticEvidenceForSourceKeys(readRepository, config, search, route.sourceKeys);
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
  const isCompanyQuestion = isCompanyOrTeamEntity(route.entity);
  const shouldExcludeIndividualEvidence = !person && (!entitySource || isCompanyQuestion);
  const shouldExcludeNamedIndividualContent =
    shouldExcludeIndividualEvidence && isTechnicalCapabilityRoute(route);

  if (route.subject && !person && (!entitySource || isCompanyQuestion)) {
    const lexicalExactTechnologyEvidence = filterIndividualContextsForCompanyLevelQuestion(
      await retrieveLexicalExactTechnologyEvidence(readRepository, config, route.subject),
      shouldExcludeNamedIndividualContent
    );

    if (lexicalExactTechnologyEvidence.length > 0) {
      const lexicalBlogTechnologyEvidence = shouldUseLexicalBlogTechnologyEvidence(
        route,
        person,
        entitySource
      )
        ? await retrieveLexicalExactBlogTechnologyEvidence(readRepository, config, route.subject)
        : [];

      return mergePrioritizedContexts(
        [lexicalExactTechnologyEvidence, lexicalBlogTechnologyEvidence],
        config.matchCount
      );
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

  const officialEvidence = shouldExcludeIndividualEvidence
    ? filterIndividualContextsForCompanyLevelQuestion(
        search
          ? await retrieveSemanticEvidenceForOrigin(
              readRepository,
              config,
              search,
              OFFICIAL_WEBSITE_SOURCE_TYPES,
              FIRST_PARTY_ORIGIN
            )
          : [],
        shouldExcludeNamedIndividualContent
      )
    : search
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
  readRepository: IRagReadRepository,
  entity: string
): Promise<IRagSourceRecord | null> {
  const entityName = normalizeName(entity);
  const sources = await readRepository.findSources({
    sourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
  });
  const matches = sources.filter(source => normalizeName(source.title) === entityName);
  return matches.length === 1 ? matches[0] : null;
}

async function retrieveSemanticEvidence(
  readRepository: IRagReadRepository,
  config: IRagConfig,
  subject: string,
  embeddingProvider: IEmbeddingProvider,
  fallbackEmbeddingProvider: IEmbeddingProvider,
  semanticSearch?: ISemanticSearchInput
): Promise<IRetrievedContext[]> {
  if (!subject) {
    return [];
  }

  const search = await resolveSemanticSearch(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
  const officialEvidence = filterIndividualContextsForCompanyLevelQuestion(
    await retrieveSemanticEvidenceForOrigin(
      readRepository,
      config,
      search,
      OFFICIAL_WEBSITE_SOURCE_TYPES,
      FIRST_PARTY_ORIGIN
    )
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
  readRepository: IRagReadRepository,
  config: IRagConfig,
  search: ISemanticSearchInput,
  sourceKeys: string[]
): Promise<IRetrievedContext[]> {
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
  readRepository: IRagReadRepository,
  config: IRagConfig,
  search: ISemanticSearchInput,
  sourceTypes: RagSourceType[],
  sourceOrigin: RagSourceOrigin
): Promise<IRetrievedContext[]> {
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
  contextGroups: IRetrievedContext[][],
  matchCount: number
): IRetrievedContext[] {
  const contextsByChunk = new Map<string, IRetrievedContext>();

  for (const context of contextGroups.flat()) {
    if (!contextsByChunk.has(context.chunkId)) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}

function isCompanyOrTeamEntity(entity: string): boolean {
  return isCompanyEntity(entity) || /\b(?:company|team|studio|we|us|you|your)\b/iu.test(entity.trim());
}

function shouldUseLexicalBlogTechnologyEvidence(
  route: IRetrievalRoute,
  person: IRagSourceRecord | null,
  entitySource: IRagSourceRecord | null
): boolean {
  return shouldUseBlogTechnologyEvidence(route, person, entitySource) && isTechnicalWritingSubject(route.subject);
}

function isTechnicalCapabilityRoute(route: IRetrievalRoute): boolean {
  return route.kind === 'technology_quality' || isExactTechnologySubject(route.subject);
}

function filterIndividualContextsForCompanyLevelQuestion(
  contexts: IRetrievedContext[],
  excludeNamedIndividualContent = false
): IRetrievedContext[] {
  return contexts.filter(
    context => !isIndividualEvidenceContext(context, excludeNamedIndividualContent)
  );
}

function isIndividualEvidenceContext(
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

function isNamedAboutContent(context: IRetrievedContext): boolean {
  if (context.sourceType !== 'about') {
    return false;
  }

  if (context.sourceKey === 'arg-team' || context.sourceKey === 'arg-team-capabilities') {
    return false;
  }

  return /(?:jose|josé|rui)/iu.test(context.content);
}
