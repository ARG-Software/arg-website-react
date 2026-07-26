import {
  GeminiEmbeddingQuotaError,
} from '../../clients/gemini.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { MatchFunction } from './types.js';

export async function createQueryEmbedding(
  query: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<{ embedding: number[]; matchFunction: MatchFunction }> {
  try {
    return {
      embedding: await embeddingProvider.embedText(query),
      matchFunction: 'match_rag_chunks',
    };
  } catch (error) {
    if (!(error instanceof GeminiEmbeddingQuotaError)) {
      throw error;
    }

    return {
      embedding: await fallbackEmbeddingProvider.embedText(query),
      matchFunction: 'match_rag_chunks_fallback',
    };
  }
}

export async function createQueryEmbeddings(
  queries: string[],
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<{ embeddings: number[][]; matchFunction: MatchFunction }> {
  try {
    return {
      embeddings: await embeddingProvider.embedTexts(queries),
      matchFunction: 'match_rag_chunks',
    };
  } catch (error) {
    if (!(error instanceof GeminiEmbeddingQuotaError)) {
      throw error;
    }

    return {
      embeddings: await fallbackEmbeddingProvider.embedTexts(queries),
      matchFunction: 'match_rag_chunks_fallback',
    };
  }
}
