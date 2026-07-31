import type {
  RagSourceMetadata,
  RagSourceOrigin,
  RagSourceType,
} from '../../../core/types/source.js';

export interface MatchRagChunkRow {
  chunk_id: string;
  source_id: string;
  source_type: RagSourceType;
  source_key: string;
  title: string;
  url: string | null;
  path: string | null;
  chunk_index: number;
  content: string;
  similarity: number;
  source_metadata: RagSourceMetadata | null;
  chunk_metadata: RagSourceMetadata | null;
}

export interface DirectSourceRow {
  id: string;
  source_type: RagSourceType;
  source_key: string;
  title: string;
  url: string | null;
  path: string | null;
  origin: RagSourceOrigin;
  is_public: boolean;
  metadata: RagSourceMetadata | null;
}

export interface DirectChunkRow {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: RagSourceMetadata | null;
}

export type MatchFunction = 'match_rag_chunks' | 'match_rag_chunks_fallback';
