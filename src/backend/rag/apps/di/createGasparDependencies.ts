import { getRagConfig, type IRagConfig } from '../../application/ragConfig.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/SupabaseRagReadRepository.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/SupabaseRagWriteRepository.js';
import {
  createAltchaChallenge,
  verifyAltchaChallenge,
  verifyAltchaPayload,
} from '../../../shared/security/altcha.js';
import type { IRateLimitConfig } from '../../../shared/security/rateLimit.js';
import { SupabaseRateLimitStore } from '../../../shared/security/rateLimitStores.js';
import { DeepSeekAnswerClient } from '../../infrastructure/llm/deepseek/DeepSeekAnswerProvider.js';
import { createDeepSeekAssistantUiCopyTranslator } from '../../infrastructure/llm/deepseek/DeepSeekAssistantUiCopyTranslator.js';

interface IGasparDependenciesOptions {
  config?: IRagConfig;
}

let cachedDependencies: ReturnType<typeof createGasparDependencies> | null = null;

export function getGasparDependencies(config: IRagConfig = getRagConfig()) {
  cachedDependencies ??= createGasparDependencies({ config });
  return cachedDependencies;
}

export function createGasparDependencies({ config = getRagConfig() }: IGasparDependenciesOptions = {}) {
  let rateLimitConfig: IRateLimitConfig | undefined;

  return {
    createAskQuestionDependencies,
    createAssistantUiCopyDependencies,
    createHumanVerificationDependencies,
    createIngestSourceDependencies,
    createMaintenanceDependencies,
    createRateLimitDependencies,
  };

  function createAskQuestionDependencies() {
    return {
      config,
      readRepository: new SupabaseRagReadRepository(
        createSupabaseServiceClient(config),
        config.siteUrl
      ),
      answerProvider: new DeepSeekAnswerClient({
        apiKey: config.aiModelApiKey,
        model: config.aiModel,
        companyName: config.companyName,
      }),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createAssistantUiCopyDependencies() {
    return {
      translator: createDeepSeekAssistantUiCopyTranslator({
        apiKey: config.aiModelApiKey,
        model: config.aiModel,
      }),
    };
  }

  function createHumanVerificationDependencies() {
    return {
      createChallenge() {
        return createAltchaChallenge(config);
      },
      verifyChallenge(payload: Parameters<typeof verifyAltchaChallenge>[0]) {
        return verifyAltchaChallenge(payload, config);
      },
      verifyPayload(payload: string) {
        return verifyAltchaPayload(payload, config);
      },
    };
  }

  function createIngestSourceDependencies() {
    return {
      chunkingConfig: config,
      repository: new SupabaseRagWriteRepository(createSupabaseServiceClient(config), config),
      embeddingProvider: new GeminiEmbeddingClient(() => createGeminiConfig(config)),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createMaintenanceDependencies() {
    return {
      supabase: createSupabaseServiceClient(config),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() => createFallbackGeminiConfig(config)),
    };
  }

  function createRateLimitDependencies() {
    return {
      config: getCachedRateLimitConfig(),
      store: new SupabaseRateLimitStore(createSupabaseServiceClient(config)),
    };
  }

  function getCachedRateLimitConfig() {
    rateLimitConfig ??= {
      perMinute: config.askRateLimitPerMinute,
      perDay: config.askRateLimitPerDay,
      globalDaily: config.askGlobalRateLimitPerDay,
      salt: config.askRateLimitSalt,
    };

    return rateLimitConfig;
  }
}

function createGeminiConfig(config: IRagConfig) {
  return {
    apiKey: config.embeddingApiKey,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
    requestDelayMs: config.embeddingRequestDelayMs,
  };
}

function createFallbackGeminiConfig(config: IRagConfig) {
  return {
    apiKey: config.embeddingApiKey,
    model: config.fallbackEmbeddingModel,
    dimensions: config.fallbackEmbeddingDimensions,
    requestDelayMs: config.embeddingRequestDelayMs,
  };
}
