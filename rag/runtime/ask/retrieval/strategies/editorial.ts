import type { RagConfig } from '../../../../core/types/config.js';
import type { RetrievedContext } from '../../../../domain/retrieval/RetrievedContext.js';
import type { EmbeddingProvider } from '../../../../domain/providers/ProviderPorts.js';
import type { RetrievalRoute } from '../../../../domain/retrieval/RetrievalRoute.js';
import type { RagReadRepository } from '../../../../repositories/RagReadRepository.js';
import { resolveSemanticSearch, type SemanticSearchInput } from '../embeddings.js';
import { retrieveContextsForOrigin } from '../vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export async function retrieveEditorialContexts({
  retrievalQuestion,
  route,
  config,
  readRepository,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  retrievalQuestion: string;
  route: RetrievalRoute;
  config: RagConfig;
  readRepository: RagReadRepository;
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

  return retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: route.firstPartySourceTypes,
  });
}
