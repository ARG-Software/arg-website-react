import type { EmbeddingProvider } from '../ports/ProviderPorts.js';
import type { RagSource, RagSourceType } from '../../domain/content/RagSource.js';
import type { ChunkingConfig } from '../ragConfig.js';
import type { RagWriteRepository } from '../ports/RagWriteRepository.js';

export interface IngestSourceInput {
  source: RagSource;
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
  chunkingConfig?: ChunkingConfig;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
  repository: RagWriteRepository;
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

export interface RagSourceEmbeddings {
  primary: number[][] | null;
  fallback: number[][] | null;
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
