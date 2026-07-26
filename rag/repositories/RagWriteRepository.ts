import type { RagSourceEmbeddings, UpsertSourceResult } from '../core/types/ingestion.js';
import type { RagSource } from '../core/types/source.js';

export interface RagWriteRepository {
  getSourceContentHash(source: Pick<RagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: RagSource, embeddings: RagSourceEmbeddings): Promise<UpsertSourceResult>;
  updateFallbackEmbeddings(source: RagSource, embeddings: number[][]): Promise<UpsertSourceResult>;
}
