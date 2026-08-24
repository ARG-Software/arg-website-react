import type { IRetrievedContext } from '../../domain/retrieval/IRetrievedContext.js';
import type { EmbeddingIndex } from './EmbeddingIndex.js';
import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../../domain/content/IRagSource.js';

export interface IRagSourceRecord {
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

export interface IFindSourcesInput {
  sourceTypes: RagSourceType[];
  sourceOrigin?: RagSourceOrigin;
}

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

export interface IRagReadRepository {
  findSources(input: IFindSourcesInput): Promise<IRagSourceRecord[]>;
  findFirstChunksForSources(sources: IRagSourceRecord[]): Promise<IRetrievedContext[]>;
  matchChunks(input: IMatchChunksInput): Promise<IRetrievedContext[]>;
  findChunksByText(input: IFindChunksByTextInput): Promise<IRetrievedContext[]>;
}
