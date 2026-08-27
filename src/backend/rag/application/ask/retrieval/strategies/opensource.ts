import type { IRagConfig } from '../../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../../domain/retrieval/iretrievedcontext.js';
import type { IEmbeddingProvider } from '../../../ports/iproviderports.js';
import type { IRagReadRepository } from '../../../ports/iragread.repository.js';
import { resolveSemanticSearch, type ISemanticSearchInput } from '../embeddings.js';
import { retrieveContextsForOrigin } from '../vectorsearch.js';

const PORTFOLIO_SOURCE_KEY = 'portfolio-pdf';
const OPEN_SOURCE_PORTFOLIO_PATTERN =
  /\b(?:Our Open Source Projects|Nx-Monorepo-Boilerplate|Browser Extension Boilerplate|Clean-Architecture|Angular-Redux|Kubernetes-Poc)\b/i;

export async function retrieveOpenSourceContexts({
  readRepository,
  config,
  retrievalQuestion,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  readRepository: IRagReadRepository;
  config: IRagConfig;
  retrievalQuestion: string;
  embeddingProvider: IEmbeddingProvider;
  fallbackEmbeddingProvider: IEmbeddingProvider;
  semanticSearch?: ISemanticSearchInput;
}): Promise<IRetrievedContext[]> {
  const search = await resolveSemanticSearch(
    retrievalQuestion,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );

  const contexts = await retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
    sourceOrigin: 'first_party',
    sourceKeys: [PORTFOLIO_SOURCE_KEY],
  });

  const openSourceContexts = contexts.filter(context =>
    OPEN_SOURCE_PORTFOLIO_PATTERN.test(context.content)
  );

  return openSourceContexts.length > 0 ? openSourceContexts : contexts;
}
