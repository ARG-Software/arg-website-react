import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import {
  getGeminiConfig,
  getGeminiFallbackEmbeddingConfig,
} from '../../infrastructure/embeddings/gemini/geminiConfig.js';
import { getChunkingConfig } from '../../application/ragConfig.js';
import type { IngestionRunOptions } from '../../application/ingestion/types.js';
import { ingestSource as ingestSourceUseCase } from '../../application/ingestion/ingestPipeline.js';
import type { RagSource } from '../../domain/content/RagSource.js';
import { loadFirstPartySources } from '../../infrastructure/ingestion/loaders/loadFirstPartySources.js';
import {
  loadTrustedExternalSource,
  loadTrustedExternalSourceEntries,
} from '../../infrastructure/ingestion/loaders/loadTrustedExternalSources.js';
import type { ExternalSourceManifestEntry } from '../../infrastructure/ingestion/SourceManifestTypes.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/SupabaseRagWriteRepository.js';
import { getSupabaseConfig } from '../../infrastructure/repositories/supabase/supabaseConfig.js';
import type { EnvSource } from '../../config/env.js';

export interface GasparIngestOptions {
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
}

interface GasparIngestionAppOptions {
  env?: EnvSource;
}

export function createGasparIngestionApp({ env = process.env }: GasparIngestionAppOptions = {}) {
  const chunkingConfig = getChunkingConfig(env);
  const repository = new SupabaseRagWriteRepository(
    createSupabaseServiceClient(getSupabaseConfig(env)),
    chunkingConfig
  );
  const embeddingProvider = new GeminiEmbeddingClient(() => getGeminiConfig(env));
  const fallbackEmbeddingProvider = new GeminiEmbeddingClient(() =>
    getGeminiFallbackEmbeddingConfig(env)
  );

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
        embeddingProvider,
        fallbackEmbeddingProvider,
        chunkingConfig,
        dryRun: options.dryRun,
        force: options.force,
        fallbackOnly: options.fallbackOnly,
      });
    },
  };
}
