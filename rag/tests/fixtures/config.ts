import type { RagConfig } from '../../config/RagConfig.js';

export function createTestConfig(overrides: Partial<RagConfig> = {}): RagConfig {
  return {
    supabaseUrl: 'https://example.supabase.co',
    supabaseServiceRoleKey: 'test-key',
    geminiApiKey: 'test-key',
    geminiEmbeddingModel: 'primary',
    geminiEmbeddingDimensions: 2,
    geminiFallbackEmbeddingModel: 'fallback',
    geminiFallbackEmbeddingDimensions: 2,
    geminiEmbeddingRequestDelayMs: 0,
    deepseekApiKey: 'test-key',
    deepseekModel: 'test-model',
    siteUrl: 'https://arg.software',
    companyName: 'ARG Software',
    chunkSize: 1200,
    chunkOverlap: 180,
    matchCount: 6,
    similarityThreshold: 0.72,
    fallbackSimilarityThreshold: 0.6,
    ...overrides,
  };
}
