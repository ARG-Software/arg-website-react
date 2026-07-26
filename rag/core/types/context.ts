import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from './source.js';

export interface RetrievedContext {
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
  sourceMetadata: RagSourceMetadata;
  chunkMetadata: RagSourceMetadata;
  origin: RagSourceOrigin;
}
