import type { IRagConfiguration } from '../../application/config/irag.configuration.js';
import { RagConfig } from '../config/rag.config.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/geminiembedding.provider.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/supabaseclient.factory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/supabaseragread.repository.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/supabaseragwrite.repository.js';
import type { IRateLimitConfig } from '../../../shared/security/ratelimit.js';
import { SupabaseRateLimitStore } from '../../../shared/security/ratelimit.stores.js';
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
  const ragConfig = config.getRagConfig();
  let rateLimitConfig: IRateLimitConfig | undefined;

  return {
    altchaSettings: config.getAltchaSettings(),
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
        config.getSiteConfig().siteUrl
      ),
      answerProvider: new DeepSeekAnswerClient({
        apiKey: config.getAiModelApiKey(),
        model: config.getAiModel(),
        companyName: config.getSiteConfig().companyName,
      }),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createAssistantUiCopyDependencies() {
    return {
      translator: createDeepSeekAssistantUiCopyTranslator({
        apiKey: config.getAiModelApiKey(),
        model: config.getAiModel(),
      }),
    };
  }

  function createIngestSourceDependencies() {
    return {
      chunkingConfig: config.getChunkingConfig(),
      repository: new SupabaseRagWriteRepository(
        createSupabaseServiceClient(createSupabaseConfig(config)),
        config.getChunkingConfig()
      ),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createMaintenanceDependencies() {
    return {
      supabase: createSupabaseServiceClient(createSupabaseConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createRateLimitDependencies() {
    return {
      config: getCachedRateLimitConfig(),
      store: new SupabaseRateLimitStore(createSupabaseServiceClient(createSupabaseConfig(config))),
    };
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
