import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingProvider } from './ai.js';
import type { RagSource, RagSourceType } from './source.js';

export interface IngestSourceInput {
  supabase?: SupabaseClient | null;
  source: RagSource;
  dryRun?: boolean;
  force?: boolean;
  embeddingProvider?: EmbeddingProvider;
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
  upsertSource(
    source: RagSource,
    embeddings: number[][]
  ): Promise<{ sourceId: string | null; chunkCount: number }>;
}

export interface IngestionRunOptions {
  all: boolean;
  force: boolean;
  sourceKeys: string[];
  filePaths: string[];
  urls: string[];
}
