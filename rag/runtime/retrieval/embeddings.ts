import { GeminiEmbeddingQuotaError } from '../../clients/gemini.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { EmbeddingIndex } from '../../core/types/retrieval.js';

export interface QueryEmbedding {
  embedding: number[];
  index: EmbeddingIndex;
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
    if (!(error instanceof GeminiEmbeddingQuotaError)) {
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
    if (!(error instanceof GeminiEmbeddingQuotaError)) {
      throw error;
    }

    return {
      embeddings: await fallbackEmbeddingProvider.embedTexts(queries),
      index: 'fallback',
    };
  }
}
