import { getRequiredEnv, getRequiredNumberEnv, type EnvSource } from '../../../config/env.js';

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions: number;
  requestDelayMs: number;
}

export function getGeminiConfig(env: EnvSource = process.env): GeminiEmbeddingConfig {
  return {
    apiKey: getRequiredEnv('EMBEDDING_API_KEY', env),
    model: getRequiredEnv('EMBEDDING_MODEL', env),
    dimensions: getRequiredNumberEnv('EMBEDDING_DIMENSIONS', env),
    requestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS', env),
  };
}

export function getGeminiFallbackEmbeddingConfig(
  env: EnvSource = process.env
): GeminiEmbeddingConfig {
  return {
    apiKey: getRequiredEnv('EMBEDDING_API_KEY', env),
    model: getRequiredEnv('FALLBACK_EMBEDDING_MODEL', env),
    dimensions: getRequiredNumberEnv('FALLBACK_EMBEDDING_DIMENSIONS', env),
    requestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS', env),
  };
}
