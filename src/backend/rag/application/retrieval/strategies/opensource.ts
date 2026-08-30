import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import { SemanticEmbeddingResolver } from '../embeddingresolver.js';
import { retrieveContextsForOrigin } from '../semanticsearch.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';

const PORTFOLIO_SOURCE_KEY = 'portfolio-pdf';
const OPEN_SOURCE_PORTFOLIO_PATTERN =
  /\b(?:Our Open Source Projects|Nx-Monorepo-Boilerplate|Browser Extension Boilerplate|Clean-Architecture|Angular-Redux|Kubernetes-Poc)\b/i;

export class OpenSourceRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig,
    private readonly embeddingResolver: SemanticEmbeddingResolver
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'open_source';
  }

  async retrieve({ retrievalQuestion, semanticSearch }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    const search = await this.embeddingResolver.resolveSearch(retrievalQuestion, semanticSearch);

    const contexts = await retrieveContextsForOrigin({
      repository: this.chunkSearchRepository,
      embedding: search.embedding,
      index: search.index,
      config: this.config,
      sourceOrigin: 'first_party',
      sourceKeys: [PORTFOLIO_SOURCE_KEY],
    });

    const openSourceContexts = contexts.filter(context =>
      OPEN_SOURCE_PORTFOLIO_PATTERN.test(context.content)
    );

    return openSourceContexts.length > 0 ? openSourceContexts : contexts;
  }
}
