import type { RagSourceType } from '../../domain/sources/ragsource.types.js';

export interface IIngestSourceResult {
  skipped: boolean;
  dryRun?: boolean;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  chunkCount: number;
  reason?: 'empty_content' | 'unchanged_content';
}

export interface IIngestionRunOptions {
  all: boolean;
  force: boolean;
  fallbackOnly: boolean;
  sourceKeys: string[];
  filePaths: string[];
  urls: string[];
}
