import type { IRagConfig } from '../../application/config/irag.configuration.js';

export function createTestConfig(overrides: Partial<IRagConfig> = {}): IRagConfig {
  return {
    siteUrl: 'https://arg.software',
    companyName: 'ARG Software',
    chunkSize: 1200,
    chunkOverlap: 180,
    matchCount: 6,
    similarityThreshold: 0.72,
    fallbackSimilarityThreshold: 0.6,
    databaseUrl: 'https://rag-project.supabase.co',
    databaseServiceRoleKey: 'service-role-key',
    embeddingApiKey: 'embedding-api-key',
    embeddingModel: 'embedding-model',
    fallbackEmbeddingModel: 'fallback-embedding-model',
    embeddingDimensions: 768,
    fallbackEmbeddingDimensions: 768,
    embeddingRequestDelayMs: 0,
    aiModelApiKey: 'ai-model-api-key',
    aiModel: 'ai-model',
    altchaHmacKey: 'altcha-hmac-key',
    altchaCost: 100,
    altchaCounterMin: 10,
    altchaCounterMax: 50,
    askRateLimitPerMinute: 6,
    askRateLimitPerDay: 30,
    askGlobalRateLimitPerDay: 500,
    askRateLimitSalt: 'arg-ask-rate-limit',
    ...overrides,
  };
}
