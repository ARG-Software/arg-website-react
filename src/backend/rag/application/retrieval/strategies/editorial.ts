import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import { SemanticEmbeddingResolver } from '../embeddingresolver.js';
import { retrieveContextsForOrigin } from '../semanticsearch.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export class EditorialRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig,
    private readonly embeddingResolver: SemanticEmbeddingResolver
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'blog';
  }

  async retrieve({ retrievalQuestion, route, semanticSearch }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    const search = await this.embeddingResolver.resolveSearch(retrievalQuestion, semanticSearch);

    return retrieveContextsForOrigin({
      repository: this.chunkSearchRepository,
      embedding: search.embedding,
      index: search.index,
      config: this.config,
      sourceOrigin: FIRST_PARTY_ORIGIN,
      sourceTypes: route.firstPartySourceTypes,
    });
  }
}
