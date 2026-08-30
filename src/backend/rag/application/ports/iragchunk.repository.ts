import type { RagSourceMetadata } from '../../domain/sources/ragsource.types.js';

export type RagChunkRecord = {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: RagSourceMetadata | null;
};

export type RagChunkUpsertRecord = {
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[] | null;
  fallbackEmbedding: number[] | null;
  metadata: RagSourceMetadata;
};

export type RagChunkFallbackEmbeddingUpdate = {
  id: string;
  embedding: number[];
};

export interface IRagChunkReadRepository {
  findBySourceId(sourceId: string): Promise<RagChunkRecord[]>;
  findFirstBySourceIds(sourceIds: string[]): Promise<RagChunkRecord[]>;
  count(): Promise<number>;
  listPage(offset: number, pageSize: number): Promise<RagChunkRecord[]>;
}

export interface IRagChunkWriteRepository {
  replaceForSource(sourceId: string, chunks: RagChunkUpsertRecord[]): Promise<void>;
  clearFallbackEmbeddings(): Promise<void>;
  updateFallbackEmbeddings(updates: RagChunkFallbackEmbeddingUpdate[]): Promise<void>;
}
