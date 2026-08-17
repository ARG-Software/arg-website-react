import type { RagConfig } from '../../application/ragConfig.js';

export function createTestConfig(overrides: Partial<RagConfig> = {}): RagConfig {
  return {
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
