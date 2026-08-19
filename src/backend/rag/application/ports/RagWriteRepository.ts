import type { RagSourceEmbeddings, UpsertSourceResult } from '../ingestion/types.js';
import type { RagSource } from '../../domain/content/RagSource.js';

export interface RagWriteRepository {
  getSourceContentHash(source: Pick<RagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: RagSource, embeddings: RagSourceEmbeddings): Promise<UpsertSourceResult>;
  updateFallbackEmbeddings(source: RagSource, embeddings: number[][]): Promise<UpsertSourceResult>;
}
