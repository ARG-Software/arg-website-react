import type { IEmbeddingProvider } from '../ports/iproviderports.js';
import type { EmbeddingIndex } from '../../domain/sources/ragsource.types.js';
import { isEmbeddingQuotaExceededError } from '../ports/providererrors.js';

export interface IQueryEmbedding {
  embedding: number[];
  index: EmbeddingIndex;
}

export interface ISemanticSearchInput extends IQueryEmbedding {
  query: string;
}

export class SemanticEmbeddingResolver {
  constructor(
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly fallbackEmbeddingProvider: IEmbeddingProvider
  ) {}

  async resolveSearch(
    query: string,
    semanticSearch?: ISemanticSearchInput
  ): Promise<ISemanticSearchInput> {
    if (semanticSearch) {
      return semanticSearch;
    }

    const { embedding, index } = await this.createEmbedding(query);

    return { query, embedding, index };
  }

  async createEmbedding(query: string): Promise<IQueryEmbedding> {
    try {
      return {
        embedding: await this.embeddingProvider.embedText(query),
        index: 'primary',
      };
    } catch (error) {
      if (!isEmbeddingQuotaExceededError(error)) {
        throw error;
      }

      return {
        embedding: await this.fallbackEmbeddingProvider.embedText(query),
        index: 'fallback',
      };
    }
  }

  async createEmbeddings(queries: string[]): Promise<{ embeddings: number[][]; index: EmbeddingIndex }> {
    try {
      return {
        embeddings: await this.embeddingProvider.embedTexts(queries),
        index: 'primary',
      };
    } catch (error) {
      if (!isEmbeddingQuotaExceededError(error)) {
        throw error;
      }

      return {
        embeddings: await this.fallbackEmbeddingProvider.embedTexts(queries),
        index: 'fallback',
      };
    }
  }
}
