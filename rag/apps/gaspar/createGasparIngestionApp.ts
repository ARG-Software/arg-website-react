import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import { getChunkingConfig } from '../../application/ragConfig.js';
import type { IngestionRunOptions } from '../../application/ingestion/types.js';
import { ingestSource as ingestSourceUseCase } from '../../application/ingestion/ingestPipeline.js';
import type { RagSource } from '../../domain/content/RagSource.js';
import { loadFirstPartySources } from '../../infrastructure/ingestion/loaders/loadFirstPartySources.js';
import {
  loadTrustedExternalSource,
  loadTrustedExternalSourceEntries,
} from '../../infrastructure/ingestion/loaders/loadTrustedExternalSources.js';
import type { ExternalSourceManifestEntry } from '../../infrastructure/ingestion/sourceManifestTypes.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/SupabaseRagWriteRepository.js';

export interface GasparIngestOptions {
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
}

export function createGasparIngestionApp() {
  const repository = new SupabaseRagWriteRepository(createSupabaseServiceClient());
  const chunkingConfig = getChunkingConfig();

  return {
    loadFirstPartySources(rootDir: string, selection?: IngestionRunOptions) {
      return loadFirstPartySources(rootDir, selection);
    },
    loadTrustedExternalSourceEntries(rootDir: string, selection?: IngestionRunOptions) {
      return loadTrustedExternalSourceEntries(rootDir, selection);
    },
    loadTrustedExternalSource(entry: ExternalSourceManifestEntry) {
      return loadTrustedExternalSource(entry);
    },
    ingestSource(source: RagSource, options: GasparIngestOptions = {}) {
      return ingestSourceUseCase({
        source,
        repository,
        embeddingProvider: geminiEmbeddingClient,
        fallbackEmbeddingProvider: geminiFallbackEmbeddingClient,
        chunkingConfig,
        dryRun: options.dryRun,
        force: options.force,
        fallbackOnly: options.fallbackOnly,
      });
    },
  };
}
