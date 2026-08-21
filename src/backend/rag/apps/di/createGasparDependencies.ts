import { getChunkingConfig, getRagConfig } from '../../application/ragConfig.js';
import type { EnvSource } from '../../config/env.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import {
  getGeminiConfig,
  getGeminiFallbackEmbeddingConfig,
} from '../../infrastructure/embeddings/gemini/geminiConfig.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/SupabaseRagReadRepository.js';
import { SupabaseRagWriteRepository } from '../../infrastructure/repositories/supabase/SupabaseRagWriteRepository.js';
import { getSupabaseConfig } from '../../infrastructure/repositories/supabase/supabaseConfig.js';
import { createAltchaChallenge, verifyAltchaChallenge, verifyAltchaPayload } from '../../../shared/security/altcha.js';
import { getRateLimitConfig } from '../../../shared/security/rateLimit.js';
import { SupabaseRateLimitStore } from '../../../shared/security/rateLimitStores.js';
import { DeepSeekAnswerClient } from '../../infrastructure/llm/deepseek/DeepSeekAnswerProvider.js';
import { createDeepSeekAssistantUiCopyTranslator } from '../../infrastructure/llm/deepseek/DeepSeekAssistantUiCopyTranslator.js';
import { getDeepSeekConfig } from '../../infrastructure/llm/deepseek/deepSeekConfig.js';

interface GasparDependenciesOptions {
  env?: EnvSource;
}

export function createGasparDependencies({ env = process.env }: GasparDependenciesOptions = {}) {
  let config: ReturnType<typeof getRagConfig> | undefined;
  let chunkingConfig: ReturnType<typeof getChunkingConfig> | undefined;
  let deepSeekConfig: ReturnType<typeof getDeepSeekConfig> | undefined;
  let geminiConfig: ReturnType<typeof getGeminiConfig> | undefined;
  let geminiFallbackEmbeddingConfig:
    | ReturnType<typeof getGeminiFallbackEmbeddingConfig>
    | undefined;
  let supabaseConfig: ReturnType<typeof getSupabaseConfig> | undefined;
  let rateLimitConfig: ReturnType<typeof getRateLimitConfig> | undefined;

  return {
    createAskQuestionDependencies,
    createAssistantUiCopyDependencies,
    createHumanVerificationDependencies,
    createIngestSourceDependencies,
    createMaintenanceDependencies,
    createRateLimitDependencies,
  };

  function createAskQuestionDependencies() {
    const ragConfig = getCachedRagConfig();

    return {
      config: ragConfig,
      readRepository: new SupabaseRagReadRepository(
        createSupabaseServiceClient(getCachedSupabaseConfig()),
        ragConfig.siteUrl
      ),
      answerProvider: new DeepSeekAnswerClient({
        ...getCachedDeepSeekConfig(),
        companyName: ragConfig.companyName,
      }),
      embeddingProvider: new GeminiEmbeddingClient(() => getCachedGeminiConfig()),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() =>
        getCachedGeminiFallbackEmbeddingConfig()
      ),
    };
  }

  function createAssistantUiCopyDependencies() {
    return {
      translator: createDeepSeekAssistantUiCopyTranslator(getCachedDeepSeekConfig()),
    };
  }

  function createHumanVerificationDependencies() {
    return {
      createChallenge() {
        return createAltchaChallenge(env);
      },
      verifyChallenge(payload: Parameters<typeof verifyAltchaChallenge>[0]) {
        return verifyAltchaChallenge(payload, env);
      },
      verifyPayload(payload: string) {
        return verifyAltchaPayload(payload, env);
      },
    };
  }

  function createIngestSourceDependencies() {
    const ingestionChunkingConfig = getCachedChunkingConfig();

    return {
      chunkingConfig: ingestionChunkingConfig,
      repository: new SupabaseRagWriteRepository(
        createSupabaseServiceClient(getCachedSupabaseConfig()),
        ingestionChunkingConfig
      ),
      embeddingProvider: new GeminiEmbeddingClient(() => getCachedGeminiConfig()),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() =>
        getCachedGeminiFallbackEmbeddingConfig()
      ),
    };
  }

  function createMaintenanceDependencies() {
    return {
      supabase: createSupabaseServiceClient(getCachedSupabaseConfig()),
      fallbackEmbeddingProvider: new GeminiEmbeddingClient(() =>
        getCachedGeminiFallbackEmbeddingConfig()
      ),
    };
  }

  function createRateLimitDependencies() {
    return {
      config: getCachedRateLimitConfig(),
      store: new SupabaseRateLimitStore(createSupabaseServiceClient(getCachedSupabaseConfig())),
    };
  }

  function getCachedRagConfig() {
    config ??= getRagConfig(env);
    return config;
  }

  function getCachedChunkingConfig() {
    chunkingConfig ??= getChunkingConfig(env);
    return chunkingConfig;
  }

  function getCachedDeepSeekConfig() {
    deepSeekConfig ??= getDeepSeekConfig(env);
    return deepSeekConfig;
  }

  function getCachedGeminiConfig() {
    geminiConfig ??= getGeminiConfig(env);
    return geminiConfig;
  }

  function getCachedGeminiFallbackEmbeddingConfig() {
    geminiFallbackEmbeddingConfig ??= getGeminiFallbackEmbeddingConfig(env);
    return geminiFallbackEmbeddingConfig;
  }

  function getCachedSupabaseConfig() {
    supabaseConfig ??= getSupabaseConfig(env);
    return supabaseConfig;
  }

  function getCachedRateLimitConfig() {
    rateLimitConfig ??= getRateLimitConfig(env, {
      prefix: 'RAG_ASK',
      defaultSalt: 'arg-ask-rate-limit',
    });
    return rateLimitConfig;
  }
}
