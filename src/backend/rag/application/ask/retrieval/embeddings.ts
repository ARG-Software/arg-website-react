import type { IEmbeddingProvider } from '../../ports/IProviderPorts.js';
import type { EmbeddingIndex } from '../../ports/EmbeddingIndex.js';
import { isEmbeddingQuotaExceededError } from '../../ports/ProviderErrors.js';

export interface IQueryEmbedding {
  embedding: number[];
  index: EmbeddingIndex;
}

export interface ISemanticSearchInput extends IQueryEmbedding {
  query: string;
}

export async function resolveSemanticSearch(
  query: string,
  embeddingProvider: IEmbeddingProvider,
  fallbackEmbeddingProvider: IEmbeddingProvider,
  semanticSearch?: ISemanticSearchInput
): Promise<ISemanticSearchInput> {
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
  embeddingProvider: IEmbeddingProvider,
  fallbackEmbeddingProvider: IEmbeddingProvider
): Promise<IQueryEmbedding> {
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
  embeddingProvider: IEmbeddingProvider,
  fallbackEmbeddingProvider: IEmbeddingProvider
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
