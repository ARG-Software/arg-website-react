import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import { mergePrioritizedContexts } from '../../../domain/sources/contextmerge.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import type { IRagSourceReadRepository } from '../../ports/iragsource.repository.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';
import type { SemanticEmbeddingResolver } from '../embeddingresolver.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';
import { retrieveContextsForOrigin } from '../semanticsearch.js';

export class AuditOfferingsRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig,
    private readonly embeddingResolver: SemanticEmbeddingResolver
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'audit_offerings';
  }

  async retrieve({
    retrievalQuestion,
    route,
    semanticSearch,
  }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    const sourceKeys = route.sourceKeys ?? [];
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes: ['working_with_us'] });
    const selectedSources = sources.filter(source => sourceKeys.includes(source.sourceKey));
    const firstChunks = await this.chunkRepository.findFirstBySourceIds(
      selectedSources.map(source => source.id)
    );
    const summaries = createContextsFromFirstChunks(selectedSources, firstChunks, this.config.siteUrl);
    const search = await this.embeddingResolver.resolveSearch(retrievalQuestion, semanticSearch);
    const details = await retrieveContextsForOrigin({
      repository: this.chunkSearchRepository,
      embedding: search.embedding,
      index: search.index,
      config: this.config,
      sourceOrigin: 'first_party',
      sourceKeys,
    });

    const leadSourceKey = details[0]?.sourceKey;
    const leadSummaries = summaries.filter(context => context.sourceKey === leadSourceKey);

    return mergePrioritizedContexts(
      [leadSummaries, summaries, details],
      summaries.length + this.config.matchCount
    );
  }
}
