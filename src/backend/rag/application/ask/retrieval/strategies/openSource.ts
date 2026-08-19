import type { RagConfig } from '../../../ragConfig.js';
import type { RetrievedContext } from '../../../../domain/retrieval/RetrievedContext.js';
import type { EmbeddingProvider } from '../../../ports/ProviderPorts.js';
import type { RagReadRepository } from '../../../ports/RagReadRepository.js';
import { resolveSemanticSearch, type SemanticSearchInput } from '../embeddings.js';
import { retrieveContextsForOrigin } from '../vectorSearch.js';

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
  readRepository: RagReadRepository;
  config: RagConfig;
  retrievalQuestion: string;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
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
