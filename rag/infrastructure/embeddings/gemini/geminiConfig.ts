import { getRequiredEnv, getRequiredNumberEnv } from '../../../config/env.js';

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions: number;
  requestDelayMs: number;
}

export function getGeminiConfig(): GeminiEmbeddingConfig {
  return {
    apiKey: getRequiredEnv('EMBEDDING_API_KEY'),
    model: getRequiredEnv('EMBEDDING_MODEL'),
    dimensions: getRequiredNumberEnv('EMBEDDING_DIMENSIONS'),
    requestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS'),
  };
}

export function getGeminiFallbackEmbeddingConfig(): GeminiEmbeddingConfig {
  return {
    apiKey: getRequiredEnv('EMBEDDING_API_KEY'),
    model: getRequiredEnv('FALLBACK_EMBEDDING_MODEL'),
    dimensions: getRequiredNumberEnv('FALLBACK_EMBEDDING_DIMENSIONS'),
    requestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS'),
  };
}
