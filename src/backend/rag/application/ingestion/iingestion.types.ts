import type { IEmbeddingProvider } from '../ports/iproviderports.js';
import type { IRagSource, RagSourceType } from '../../domain/content/iragsource.js';
import type { IChunkingConfig } from '../config/irag.configuration.js';
import type { IRagWriteRepository } from '../ports/iragwrite.repository.js';

export interface IIngestSourceInput {
  source: IRagSource;
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
  chunkingConfig?: IChunkingConfig;
  embeddingProvider?: IEmbeddingProvider;
  fallbackEmbeddingProvider?: IEmbeddingProvider;
  repository: IRagWriteRepository;
}

export interface IIngestSourceResult {
  skipped: boolean;
  dryRun?: boolean;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  chunkCount: number;
  reason?: 'empty_content' | 'unchanged_content';
}

export interface IRagSourceEmbeddings {
  primary: number[][] | null;
  fallback: number[][] | null;
}

export interface IUpsertSourceResult {
  sourceId: string | null;
  chunkCount: number;
}

export interface IIngestionRunOptions {
  all: boolean;
  force: boolean;
  fallbackOnly: boolean;
  sourceKeys: string[];
  filePaths: string[];
  urls: string[];
}
