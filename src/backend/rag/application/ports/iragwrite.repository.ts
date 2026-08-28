import type { IRagSourceEmbeddings, IUpsertSourceResult } from '../ingestion/iingestion.types.js';
import type { IRagSource } from '../../domain/content/iragsource.js';

export interface IRagWriteRepository {
  getSourceContentHash(source: Pick<IRagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: IRagSource, embeddings: IRagSourceEmbeddings): Promise<IUpsertSourceResult>;
  updateFallbackEmbeddings(source: IRagSource, embeddings: number[][]): Promise<IUpsertSourceResult>;
}
