import type { EmbeddingProvider } from '../../../core/types/providers.js';
import type { EmbeddingIndex } from '../../../core/types/retrieval.js';
import { isEmbeddingQuotaExceededError } from '../../../domain/providers/ProviderErrors.js';

export interface QueryEmbedding {
  embedding: number[];
  index: EmbeddingIndex;
}

export interface SemanticSearchInput extends QueryEmbedding {
  query: string;
}

export async function resolveSemanticSearch(
  query: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider,
  semanticSearch?: SemanticSearchInput
): Promise<SemanticSearchInput> {
  if (semanticSearch) {
    return semanticSearch;
  }

  const { embedding, index } = await createQueryEmbedding(
    query,
    embeddingProvider,
    fallbackEmbeddingProvider
  );

  return { query, embedding, index };
}

export async function createQueryEmbedding(
  query: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<QueryEmbedding> {
  try {
    return {
      embedding: await embeddingProvider.embedText(query),
      index: 'primary',
    };
  } catch (error) {
    if (!isEmbeddingQuotaExceededError(error)) {
      throw error;
    }

    return {
      embedding: await fallbackEmbeddingProvider.embedText(query),
      index: 'fallback',
    };
  }
}

export async function createQueryEmbeddings(
  queries: string[],
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<{ embeddings: number[][]; index: EmbeddingIndex }> {
  try {
    return {
      embeddings: await embeddingProvider.embedTexts(queries),
      index: 'primary',
    };
  } catch (error) {
    if (!isEmbeddingQuotaExceededError(error)) {
      throw error;
    }

    return {
      embeddings: await fallbackEmbeddingProvider.embedTexts(queries),
      index: 'fallback',
    };
  }
}
