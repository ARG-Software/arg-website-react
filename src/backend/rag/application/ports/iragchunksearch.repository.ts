import type { EmbeddingIndex, RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../../domain/sources/ragsource.types.js';

export interface IMatchChunksInput {
  embedding: number[];
  index: EmbeddingIndex;
  matchCount: number;
  similarityThreshold: number;
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
}

export interface IFindChunksByTextInput {
  terms: string[];
  matchCount: number;
  sourceOrigin?: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
}

export type RagMatchedChunkRecord = {
  chunkId: string;
  sourceId: string;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url: string | null;
  path: string | null;
  chunkIndex: number;
  content: string;
  similarity: number;
  sourceMetadata: RagSourceMetadata | null;
  chunkMetadata: RagSourceMetadata | null;
  origin: RagSourceOrigin;
};

export interface IRagChunkSearchRepository {
  matchChunks(input: IMatchChunksInput): Promise<RagMatchedChunkRecord[]>;
  findChunksByText(input: IFindChunksByTextInput): Promise<RagMatchedChunkRecord[]>;
}
