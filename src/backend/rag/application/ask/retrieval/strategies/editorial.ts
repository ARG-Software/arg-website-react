import type { IRagConfig } from '../../../ragConfig.js';
import type { IRetrievedContext } from '../../../../domain/retrieval/IRetrievedContext.js';
import type { IEmbeddingProvider } from '../../../ports/IProviderPorts.js';
import type { IRetrievalRoute } from '../../../../domain/retrieval/IRetrievalRoute.js';
import type { IRagReadRepository } from '../../../ports/IRagReadRepository.js';
import { resolveSemanticSearch, type ISemanticSearchInput } from '../embeddings.js';
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
  route: IRetrievalRoute;
  config: IRagConfig;
  readRepository: IRagReadRepository;
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

  return retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: route.firstPartySourceTypes,
  });
}
