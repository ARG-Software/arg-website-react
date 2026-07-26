import type { RagConfig } from '../../core/types/config.js';
import type { RetrievedContext } from '../../core/types/context.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { EmbeddingIndex, RetrievalRoute } from '../../core/types/retrieval.js';
import type { RagReadRepository } from '../../repositories/RagReadRepository.js';
import { createQueryEmbedding } from './embeddings.js';
import { retrieveDirectEvidenceContexts } from './directEvidence.js';
import { retrieveLatestBlogContexts } from './latestBlog.js';
import { retrieveContextsForOrigin } from './vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export interface RetrievalResult {
  contexts: RetrievedContext[];
  route: RetrievalRoute;
}

export interface RetrieveRoutedContextsInput {
  retrievalQuestion: string;
  route: RetrievalRoute;
  config: RagConfig;
  readRepository: RagReadRepository;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  embedding?: number[];
  index?: EmbeddingIndex;
}

export async function retrieveRoutedContexts({
  retrievalQuestion,
  route,
  config,
  readRepository,
  embeddingProvider,
  fallbackEmbeddingProvider,
  embedding,
  index,
}: RetrieveRoutedContextsInput): Promise<RetrievalResult> {
  if (route.kind === 'latest_blog') {
    return {
      contexts: await retrieveLatestBlogContexts(readRepository),
      route,
    };
  }

  if (route.kind === 'direct_evidence') {
    return {
      contexts: await retrieveDirectEvidenceContexts({
        readRepository,
        config,
        route,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch:
          embedding && index
            ? { query: retrievalQuestion, embedding, index }
            : undefined,
      }),
      route,
    };
  }

  const semanticSearch =
    embedding && index
      ? { embedding, index }
      : await createQueryEmbedding(retrievalQuestion, embeddingProvider, fallbackEmbeddingProvider);
  const firstPartyContexts = await retrieveContextsForOrigin({
    repository: readRepository,
    embedding: semanticSearch.embedding,
    index: semanticSearch.index,
    config,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: route.firstPartySourceTypes,
  });

  return {
    contexts: firstPartyContexts,
    route,
  };
}
