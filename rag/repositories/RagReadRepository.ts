import type { RetrievedContext } from '../core/types/context.js';
import type { EmbeddingIndex } from '../core/types/retrieval.js';
import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../core/types/source.js';

export interface RagSourceRecord {
  id: string;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url: string | null;
  path: string | null;
  origin: RagSourceOrigin;
  isPublic: boolean;
  metadata: RagSourceMetadata | null;
}

export interface FindSourcesInput {
  sourceTypes: RagSourceType[];
  sourceOrigin?: RagSourceOrigin;
}

export interface MatchChunksInput {
  embedding: number[];
  index: EmbeddingIndex;
  matchCount: number;
  similarityThreshold: number;
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
}

export interface FindChunksByTextInput {
  terms: string[];
  matchCount: number;
  sourceOrigin?: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
}

export interface RagReadRepository {
  findSources(input: FindSourcesInput): Promise<RagSourceRecord[]>;
  findFirstChunksForSources(sources: RagSourceRecord[]): Promise<RetrievedContext[]>;
  matchChunks(input: MatchChunksInput): Promise<RetrievedContext[]>;
  findChunksByText(input: FindChunksByTextInput): Promise<RetrievedContext[]>;
}
