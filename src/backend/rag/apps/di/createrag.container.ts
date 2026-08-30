import { createClient } from '@supabase/supabase-js';

import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askassistantquestion.usecase.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getassistantuicopy.usecase.js';
import { RetrieveRelevantChunksUseCase } from '../../application/usecases/assistant/retrieverelevantchunks.usecase.js';
import { IngestSourceUseCase } from '../../application/usecases/ingestion/ingestsource.usecase.js';
import { RebuildFallbackEmbeddingsUseCase } from '../../application/usecases/maintenance/rebuildfallbackembeddings.usecase.js';
import { ConsoleLogger } from '../../../shared/logger/console.logger.js';
import { SupabaseRateLimitRepository } from '../../../shared/infrastructure/repositories/supabase/supabaseratelimit.repository.js';
import { RateLimiter, type IRateLimitConfig } from '../../../shared/security/ratelimit.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/geminiembedding.provider.js';
import { DeepSeekClient } from '../../infrastructure/llm/deepseek/deepseek.provider.js';
import { SupabaseRagChunkRepository } from '../../infrastructure/repositories/supabase/supabaseragchunk.repository.js';
import { SupabaseRagChunkSearchRepository } from '../../infrastructure/repositories/supabase/supabaseragchunksearch.repository.js';
import { SupabaseRagSourceRepository } from '../../infrastructure/repositories/supabase/supabaseragsource.repository.js';
import { RagConfig } from '../config/rag.config.js';
import type { IRagConfiguration } from '../../application/config/irag.configuration.js';
import { SemanticEmbeddingResolver } from '../../application/retrieval/embeddingresolver.js';
import { SemanticRetrievalEmbeddingPlanner } from '../../application/retrievalplanning/createsemanticembeddings.js';
import { createRoutedContextRetriever } from '../../application/retrieval/createroutedcontextretriever.js';

interface IRagContainerOptions {
  config?: IRagConfiguration;
}

export function createRagContainer({ config = RagConfig.load() }: IRagContainerOptions = {}) {
  const logger = new ConsoleLogger();
  const ragConfig = config.getRagConfig();
  const supabase = createClient(config.getDatabaseUrl(), config.getDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sourceRepository = new SupabaseRagSourceRepository(supabase, logger);
  const chunkRepository = new SupabaseRagChunkRepository(supabase, logger);
  const chunkSearchRepository = new SupabaseRagChunkSearchRepository(supabase, logger);
  const embeddingProvider = new GeminiEmbeddingClient(() => createGeminiConfig(config), logger);
  const fallbackEmbeddingProvider = new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config), logger);
  const llmProvider = new DeepSeekClient({
    apiKey: config.getAiModelApiKey(),
    model: config.getAiModel(),
    companyName: config.getSiteConfig().companyName,
  }, logger);
  const embeddingResolver = new SemanticEmbeddingResolver(embeddingProvider, fallbackEmbeddingProvider);
  const semanticEmbeddingPlanner = new SemanticRetrievalEmbeddingPlanner(embeddingResolver);
  const routedContextRetriever = createRoutedContextRetriever({
    sourceRepository,
    chunkRepository,
    chunkSearchRepository,
    config: ragConfig,
    embeddingResolver,
  });
  let rateLimitConfig: IRateLimitConfig | undefined;

  return {
    assistant: {
      askAssistantQuestionUseCase: new AskAssistantQuestionUseCase(
        ragConfig,
        llmProvider,
        semanticEmbeddingPlanner,
        routedContextRetriever,
        logger
      ),
      retrieveRelevantChunksUseCase: new RetrieveRelevantChunksUseCase(llmProvider, routedContextRetriever),
      getAssistantUiCopyUseCase: new GetAssistantUiCopyUseCase(
        llmProvider,
        logger
      ),
    },
    ingestion: {
      ingestSourceUseCase: new IngestSourceUseCase(
        sourceRepository,
        sourceRepository,
        chunkRepository,
        chunkRepository,
        embeddingProvider,
        fallbackEmbeddingProvider,
        config.getChunkingConfig()
      ),
    },
    maintenance: {
      rebuildFallbackEmbeddingsUseCase: new RebuildFallbackEmbeddingsUseCase(
        chunkRepository,
        chunkRepository,
        fallbackEmbeddingProvider
      ),
    },
    security: {
      altchaSettings: config.getAltchaSettings(),
      askRateLimiter: new RateLimiter(
        new SupabaseRateLimitRepository(supabase, 'hit_rag_rate_limit', logger),
        getCachedRateLimitConfig()
      ),
    },
    logger,
  };

  function getCachedRateLimitConfig() {
    rateLimitConfig ??= config.getAskRateLimitConfig();

    return rateLimitConfig;
  }
}

function createGeminiConfig(config: IRagConfiguration) {
  return {
    apiKey: config.getEmbeddingApiKey(),
    model: config.getEmbeddingModel(),
    dimensions: config.getEmbeddingDimensions(),
    requestDelayMs: config.getEmbeddingRequestDelayMs(),
  };
}

function createFallbackGeminiConfig(config: IRagConfiguration) {
  return {
    apiKey: config.getEmbeddingApiKey(),
    model: config.getFallbackEmbeddingModel(),
    dimensions: config.getFallbackEmbeddingDimensions(),
    requestDelayMs: config.getEmbeddingRequestDelayMs(),
  };
}
