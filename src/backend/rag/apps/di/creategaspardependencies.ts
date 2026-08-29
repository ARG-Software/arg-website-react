import type { IRagConfiguration } from '../../application/config/irag.configuration.js';
import { ConsoleLogger } from '../../../shared/logger/console.logger.js';
import { RagConfig } from '../config/rag.config.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/geminiembedding.provider.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/supabaseclient.factory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/supabaseragread.repository.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/supabaseragwrite.repository.js';
import type { IRateLimitConfig } from '../../../shared/security/ratelimit.js';
import { SupabaseRateLimitRepository } from '../../../shared/infrastructure/repositories/supabase/supabaseratelimit.repository.js';
import { RateLimiter } from '../../../shared/security/ratelimit.js';
import { DeepSeekAnswerClient } from '../../infrastructure/llm/deepseek/deepseekanswer.provider.js';
import { createDeepSeekAssistantUiCopyTranslator } from '../../infrastructure/llm/deepseek/deepseekassistantuicopy.translator.js';

interface IGasparDependenciesOptions {
  config?: IRagConfiguration;
}

let cachedDependencies: ReturnType<typeof createGasparDependencies> | null = null;

export function getGasparDependencies(config: IRagConfiguration = RagConfig.load()) {
  cachedDependencies ??= createGasparDependencies({ config });
  return cachedDependencies;
}

export function createGasparDependencies({ config = RagConfig.load() }: IGasparDependenciesOptions = {}) {
  const logger = new ConsoleLogger();
  const ragConfig = config.getRagConfig();
  let rateLimitConfig: IRateLimitConfig | undefined;

  return {
    altchaSettings: config.getAltchaSettings(),
    logger,
    createAskQuestionDependencies,
    createAssistantUiCopyDependencies,
    createIngestSourceDependencies,
    createMaintenanceDependencies,
    createRateLimitDependencies,
  };

  function createAskQuestionDependencies() {
    return {
      config: ragConfig,
      readRepository: new SupabaseRagReadRepository(
        createSupabaseServiceClient(createSupabaseConfig(config)),
        config.getSiteConfig().siteUrl,
        logger
      ),
      answerProvider: new DeepSeekAnswerClient({
        apiKey: config.getAiModelApiKey(),
        model: config.getAiModel(),
        companyName: config.getSiteConfig().companyName,
      }, logger),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config), logger),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config), logger),
    };
  }

  function createAssistantUiCopyDependencies() {
    return {
      translator: createDeepSeekAssistantUiCopyTranslator({
        apiKey: config.getAiModelApiKey(),
        model: config.getAiModel(),
      }, logger),
    };
  }

  function createIngestSourceDependencies() {
    return {
      chunkingConfig: config.getChunkingConfig(),
      repository: new SupabaseRagWriteRepository(
        createSupabaseServiceClient(createSupabaseConfig(config)),
        config.getChunkingConfig(),
        logger
      ),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config), logger),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config), logger),
    };
  }

  function createMaintenanceDependencies() {
    return {
      supabase: createSupabaseServiceClient(createSupabaseConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config), logger),
    };
  }

  function createRateLimitDependencies() {
    return new RateLimiter(
      new SupabaseRateLimitRepository(
        createSupabaseServiceClient(createSupabaseConfig(config)),
        'hit_rag_rate_limit',
        logger
      ),
      getCachedRateLimitConfig()
    );
  }

  function getCachedRateLimitConfig() {
    rateLimitConfig ??= config.getAskRateLimitConfig();

    return rateLimitConfig;
  }
}

function createSupabaseConfig(config: IRagConfiguration) {
  return {
    databaseUrl: config.getDatabaseUrl(),
    databaseServiceRoleKey: config.getDatabaseServiceRoleKey(),
  };
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
