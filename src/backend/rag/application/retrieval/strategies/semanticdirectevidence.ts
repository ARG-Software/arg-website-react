import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { RagSourceOrigin, RagSourceType } from '../../../domain/sources/ragsource.types.js';
import {
  BLOG_SOURCE_TYPES,
  DIRECT_EVIDENCE_SOURCE_TYPES,
  FAQ_SOURCE_TYPES,
  OFFICIAL_WEBSITE_SOURCE_TYPES,
  TRUSTED_EXTERNAL_SOURCE_TYPES,
} from '../../../domain/routing/retrievalroute.js';
import { normalizeName } from '../../../domain/technologies/technologynames.js';
import {
  filterIndividualContextsForCompanyLevelQuestion,
  isCompanyOrTeamEntity,
  isTechnicalCapabilityRoute,
  shouldUseLexicalBlogTechnologyEvidence,
} from '../../../domain/claims/evidencepolicy.js';
import { mergePrioritizedContexts } from '../../../domain/sources/contextmerge.js';
import {
  filterExactTechnologyEvidence,
  isExactTechnologySubject,
  shouldUseBlogTechnologyEvidence,
} from '../../../domain/claims/technologyclaims.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository, RagSourceRecord } from '../../ports/iragsource.repository.js';
import { SemanticEmbeddingResolver, type ISemanticSearchInput } from '../embeddingresolver.js';
import { retrieveContextsForOrigin } from '../semanticsearch.js';
import { ExactTechnologyEvidenceRetriever } from './exacttechnology.js';
import { isBroadPersonProfileSubject } from '../../../domain/claims/personprofileclaims.js';
import { isProjectReferenceQuestion } from '../../../domain/claims/projectreferenceclaims.js';
import { PersonProfileRetriever } from './personprofile.js';
import { ProjectReferenceRetriever } from './projectreferences.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';

const FIRST_PARTY_ORIGIN = 'first_party';
const TRUSTED_EXTERNAL_ORIGIN = 'trusted_external';

export class DirectEvidenceRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig,
    private readonly embeddingResolver: SemanticEmbeddingResolver,
    private readonly exactTechnologyRetriever: ExactTechnologyEvidenceRetriever,
    private readonly personProfileRetriever: PersonProfileRetriever,
    private readonly projectReferenceRetriever: ProjectReferenceRetriever
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind !== 'blog';
  }

  async retrieve({
    retrievalQuestion,
    route,
    semanticSearch,
  }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    if (isProjectReferenceQuestion(retrievalQuestion, route.subject)) {
      return this.projectReferenceRetriever.retrieve(retrievalQuestion, route.subject);
    }

    if (route.sourceKeys?.length && route.subject) {
      const search = await this.embeddingResolver.resolveSearch(route.subject, semanticSearch);

      return this.retrieveSemanticEvidenceForSourceKeys(search, route.sourceKeys);
    }

    const person = route.entity ? await this.personProfileRetriever.findPersonSource(route.entity) : null;

    if (person && route.subject && isBroadPersonProfileSubject(route.subject)) {
      return this.personProfileRetriever.retrieveBroadProfileContexts(
        person,
        route.subject,
        semanticSearch
      );
    }

    if (!route.subject && route.entity) {
      const entitySource = person ?? (await this.findDirectSource(route.entity));
      if (!entitySource) return [];

      const chunks = await this.chunkRepository.findFirstBySourceIds([entitySource.id]);
      return createContextsFromFirstChunks([entitySource], chunks, this.config.siteUrl);
    }

    return this.retrieveSubjectEvidence(route, person, semanticSearch);
  }

  private async retrieveSubjectEvidence(
    route: IRetrievalRoute,
    person: RagSourceRecord | null,
    semanticSearch?: ISemanticSearchInput
  ): Promise<IRetrievedContext[]> {
    const entitySource = !person && route.entity ? await this.findDirectSource(route.entity) : null;
    const isCompanyQuestion = isCompanyOrTeamEntity(route.entity);
    const excludeIndividualEvidence = !person && (!entitySource || isCompanyQuestion);
    const excludeNamedIndividualContent = excludeIndividualEvidence && isTechnicalCapabilityRoute(route);

    if (route.subject && excludeIndividualEvidence) {
      const lexicalTechnologyEvidence = await this.retrieveLexicalTechnologyEvidence(
        route,
        person,
        entitySource,
        excludeNamedIndividualContent
      );

      if (lexicalTechnologyEvidence.length > 0) {
        return lexicalTechnologyEvidence;
      }
    }

    const search = route.subject
      ? await this.embeddingResolver.resolveSearch(route.subject, semanticSearch)
      : null;
    const personalEvidence = person && search
      ? await this.personProfileRetriever.retrieveSemanticEvidence(person, search)
      : [];
    const entityEvidence = entitySource && search
      ? await this.retrieveSemanticEvidenceForSourceKeys(search, [entitySource.sourceKey])
      : [];

    if (route.entity && !person && !entitySource && !isCompanyQuestion) {
      return [];
    }

    if (entitySource && !isCompanyQuestion) {
      return entityEvidence;
    }

    const unfilteredOfficialEvidence = await this.searchInOrigin(
      search,
      OFFICIAL_WEBSITE_SOURCE_TYPES,
      FIRST_PARTY_ORIGIN
    );
    const officialEvidence = excludeIndividualEvidence
      ? filterIndividualContextsForCompanyLevelQuestion(
          unfilteredOfficialEvidence,
          excludeNamedIndividualContent
        )
      : unfilteredOfficialEvidence;
    const faqEvidence = await this.searchInOrigin(search, FAQ_SOURCE_TYPES, FIRST_PARTY_ORIGIN);
    const trustedExternalEvidence = await this.searchInOrigin(
      search,
      TRUSTED_EXTERNAL_SOURCE_TYPES,
      TRUSTED_EXTERNAL_ORIGIN
    );
    const blogTechnologyEvidence = shouldUseBlogTechnologyEvidence(route, person, entitySource)
      ? await this.searchInOrigin(search, BLOG_SOURCE_TYPES, FIRST_PARTY_ORIGIN)
      : [];
    const mergedContextLimit = isExactTechnologySubject(route.subject)
      ? Number.MAX_SAFE_INTEGER
      : this.config.matchCount;
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
      this.config.matchCount
    );

    if (isExactTechnologySubject(route.subject) || person || exactTechnologyEvidence.length > 0) {
      return exactTechnologyEvidence;
    }

    return this.retrieveSemanticEvidence(route.subject, semanticSearch);
  }

  private async retrieveLexicalTechnologyEvidence(
    route: IRetrievalRoute,
    person: RagSourceRecord | null,
    entitySource: RagSourceRecord | null,
    excludeNamedIndividualContent: boolean
  ): Promise<IRetrievedContext[]> {
    const authoritativeEvidence = filterIndividualContextsForCompanyLevelQuestion(
      await this.exactTechnologyRetriever.retrieveAuthoritativeEvidence(route.subject),
      excludeNamedIndividualContent
    );

    if (authoritativeEvidence.length === 0) {
      return [];
    }

    const blogEvidence = shouldUseLexicalBlogTechnologyEvidence(route, person, entitySource)
      ? await this.exactTechnologyRetriever.retrieveBlogEvidence(route.subject)
      : [];

    return mergePrioritizedContexts([authoritativeEvidence, blogEvidence], this.config.matchCount);
  }

  private async findDirectSource(entity: string): Promise<RagSourceRecord | null> {
    const entityName = normalizeName(entity);
    const sources = await this.sourceRepository.findPublicByTypes({
      sourceTypes: DIRECT_EVIDENCE_SOURCE_TYPES,
    });
    const matches = sources.filter(source => normalizeName(source.title) === entityName);

    return matches.length === 1 ? matches[0] : null;
  }

  private async retrieveSemanticEvidence(
    subject: string,
    semanticSearch?: ISemanticSearchInput
  ): Promise<IRetrievedContext[]> {
    if (!subject) {
      return [];
    }

    const search = await this.embeddingResolver.resolveSearch(subject, semanticSearch);
    const officialEvidence = filterIndividualContextsForCompanyLevelQuestion(
      await this.searchInOrigin(search, OFFICIAL_WEBSITE_SOURCE_TYPES, FIRST_PARTY_ORIGIN)
    );
    const faqEvidence = await this.searchInOrigin(search, FAQ_SOURCE_TYPES, FIRST_PARTY_ORIGIN);
    const trustedExternalEvidence = await this.searchInOrigin(
      search,
      TRUSTED_EXTERNAL_SOURCE_TYPES,
      TRUSTED_EXTERNAL_ORIGIN
    );

    return mergePrioritizedContexts(
      [officialEvidence, faqEvidence, trustedExternalEvidence],
      this.config.matchCount
    );
  }

  private async retrieveSemanticEvidenceForSourceKeys(
    search: ISemanticSearchInput,
    sourceKeys: string[]
  ): Promise<IRetrievedContext[]> {
    if (sourceKeys.length === 0) {
      return [];
    }

    return retrieveContextsForOrigin({
      repository: this.chunkSearchRepository,
      embedding: search.embedding,
      index: search.index,
      config: this.config,
      sourceOrigin: FIRST_PARTY_ORIGIN,
      sourceKeys,
    });
  }

  private async searchInOrigin(
    search: ISemanticSearchInput | null,
    sourceTypes: RagSourceType[],
    sourceOrigin: RagSourceOrigin
  ): Promise<IRetrievedContext[]> {
    if (!search) {
      return [];
    }

    return retrieveContextsForOrigin({
      repository: this.chunkSearchRepository,
      embedding: search.embedding,
      index: search.index,
      config: this.config,
      sourceOrigin,
      sourceTypes,
    });
  }
}
