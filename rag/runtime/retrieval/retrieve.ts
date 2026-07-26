import type { RagConfig } from '../../core/types/config.js';
import type { RetrievedContext } from '../../core/types/context.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { EmbeddingIndex, RetrievalRoute } from '../../core/types/retrieval.js';
import type { RagReadRepository } from '../../repositories/RagReadRepository.js';
import { retrieveEditorialContexts } from './strategies/editorial.js';
import { retrieveLatestBlogContexts } from './strategies/latestBlog.js';
import { retrieveDirectEvidenceContexts } from './strategies/semanticDirectEvidence.js';

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

  const semanticSearch = embedding && index ? { query: retrievalQuestion, embedding, index } : undefined;

  if (route.kind === 'direct_evidence') {
    return {
      contexts: await retrieveDirectEvidenceContexts({
        readRepository,
        config,
        retrievalQuestion,
        route,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch,
      }),
      route,
    };
  }

  return {
    contexts: await retrieveEditorialContexts({
      retrievalQuestion,
      route,
      config,
      readRepository,
      embeddingProvider,
      fallbackEmbeddingProvider,
      semanticSearch,
    }),
    route,
  };
}
