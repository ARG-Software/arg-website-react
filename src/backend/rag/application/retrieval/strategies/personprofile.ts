import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import {
  asksCompanyOrigin,
  asksProfessionalBackground,
  getPersonKey,
} from '../../../domain/claims/personprofileclaims.js';
import { normalizeName } from '../../../domain/technologies/technologynames.js';
import { mergeComplementaryContexts } from '../../../domain/sources/contextmerge.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import type { IRagSourceReadRepository, RagSourceRecord } from '../../ports/iragsource.repository.js';
import { SemanticEmbeddingResolver, type ISemanticSearchInput } from '../embeddingresolver.js';
import { retrieveContextsForOrigin } from '../semanticsearch.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export class PersonProfileRetriever {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig,
    private readonly embeddingResolver: SemanticEmbeddingResolver
  ) {}

  async findPersonSource(entity: string): Promise<RagSourceRecord | null> {
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes: ['about'] });
    const people = sources.filter(source => getPersonKey(source.metadata));
    const entityName = normalizeName(entity);
    const matches = people.filter(source => normalizeName(source.title) === entityName);
    if (matches.length === 1) {
      return matches[0];
    }
    const firstNameMatches = people.filter(
      source => normalizeName(source.title).split(' ')[0] === entityName
    );
    return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
  }

  async retrieveBroadProfileContexts(
    person: RagSourceRecord,
    subject: string,
    semanticSearch?: ISemanticSearchInput
  ): Promise<IRetrievedContext[]> {
    const sources = [person];
    if (asksCompanyOrigin(subject)) {
      const aboutSource = await this.findAboutSource();
      if (aboutSource) {
        sources.push(aboutSource);
      }
    }
    if (asksProfessionalBackground(subject)) {
      sources.push(...(await this.findPersonDocuments(person)));
    }
    const uniqueProfileSources = uniqueSources(sources);
    const search = await this.embeddingResolver.resolveSearch(subject, semanticSearch);
    const semanticContexts = await this.retrieveSemanticEvidenceForSourceKeys(
      search,
      uniqueProfileSources.map(source => source.sourceKey)
    );
    const chunks = await this.chunkRepository.findFirstBySourceIds(
      uniqueProfileSources.map(source => source.id)
    );
    const anchorContexts = createContextsFromFirstChunks(
      uniqueProfileSources,
      chunks,
      this.config.siteUrl
    );
    return mergeComplementaryContexts([semanticContexts, anchorContexts], this.config.matchCount);
  }

  async retrieveSemanticEvidence(
    person: RagSourceRecord,
    search: ISemanticSearchInput
  ): Promise<IRetrievedContext[]> {
    const documents = await this.findPersonDocuments(person);
    return this.retrieveSemanticEvidenceForSourceKeys(
      search,
      [person, ...documents].map(source => source.sourceKey)
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

  private async findPersonDocuments(person: RagSourceRecord): Promise<RagSourceRecord[]> {
    const personKey = getPersonKey(person.metadata);
    if (!personKey) {
      return [];
    }
    const documents = await this.sourceRepository.findPublicByTypes({
      sourceTypes: ['local_document'],
    });
    return documents.filter(source => source.metadata?.person_key === personKey);
  }

  private async findAboutSource(): Promise<RagSourceRecord | null> {
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes: ['about'] });
    return sources.find(source => source.sourceKey === 'about') ?? null;
  }
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
