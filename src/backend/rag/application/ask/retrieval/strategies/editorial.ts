import type { IRagConfig } from '../../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../../domain/retrieval/iretrievedcontext.js';
import type { IEmbeddingProvider } from '../../../ports/iproviderports.js';
import type { IRetrievalRoute } from '../../../../domain/retrieval/iretrievalroute.js';
import type { IRagReadRepository } from '../../../ports/iragread.repository.js';
import { resolveSemanticSearch, type ISemanticSearchInput } from '../embeddings.js';
import { retrieveContextsForOrigin } from '../vectorsearch.js';

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
