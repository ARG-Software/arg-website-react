import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingProvider } from './ai.js';
import type { RagSource, RagSourceType } from './source.js';

export interface IngestSourceInput {
  supabase?: SupabaseClient | null;
  source: RagSource;
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
  repository?: RagSourceRepository;
}

export interface IngestSourceResult {
  skipped: boolean;
  dryRun?: boolean;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  chunkCount: number;
  reason?: 'empty_content' | 'unchanged_content';
}

export interface RagSourceRepository {
  getSourceContentHash(source: Pick<RagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(source: RagSource, embeddings: RagSourceEmbeddings): Promise<UpsertSourceResult>;
  updateFallbackEmbeddings(source: RagSource, embeddings: number[][]): Promise<UpsertSourceResult>;
}

export interface RagSourceEmbeddings {
  primary: number[][] | null;
  fallback: number[][];
}

export interface UpsertSourceResult {
  sourceId: string | null;
  chunkCount: number;
}

export interface IngestionRunOptions {
  all: boolean;
  force: boolean;
  fallbackOnly: boolean;
  sourceKeys: string[];
  filePaths: string[];
  urls: string[];
}
