import type { IRagSourceEmbeddings, IUpsertSourceResult } from '../ingestion/IIngestionTypes.js';
import type { IRagSource } from '../../domain/content/IRagSource.js';

export interface IRagWriteRepository {
  getSourceContentHash(source: Pick<IRagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: IRagSource, embeddings: IRagSourceEmbeddings): Promise<IUpsertSourceResult>;
  updateFallbackEmbeddings(source: IRagSource, embeddings: number[][]): Promise<IUpsertSourceResult>;
}
