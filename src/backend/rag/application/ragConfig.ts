import {
  getRequiredEnv,
  getRequiredNumberEnv,
  validateRequiredEnv,
  type IEnvSource,
} from '../config/env.js';

export interface ISiteConfig {
  siteUrl: string;
  companyName: string;
}

export interface IChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface IRetrievalConfig {
  matchCount: number;
  similarityThreshold: number;
  fallbackSimilarityThreshold: number;
}

export interface IRagConfig extends ISiteConfig, IChunkingConfig, IRetrievalConfig {
  databaseUrl: string;
  databaseServiceRoleKey: string;
  embeddingApiKey: string;
  embeddingModel: string;
  fallbackEmbeddingModel: string;
  embeddingDimensions: number;
  fallbackEmbeddingDimensions: number;
  embeddingRequestDelayMs: number;
  aiModelApiKey: string;
  aiModel: string;
  altchaHmacKey: string;
  altchaCost: number;
  altchaCounterMin: number;
  altchaCounterMax: number;
  askRateLimitPerMinute: number;
  askRateLimitPerDay: number;
  askGlobalRateLimitPerDay: number;
  askRateLimitSalt: string;
}

export function getRagConfig(env: IEnvSource = process.env): IRagConfig {
  validateRequiredEnv(env);

  return {
    ...getSiteConfig(env),
    ...getChunkingConfig(env),
    ...getRetrievalConfig(env),
    databaseUrl: getRequiredEnv('RAG_DATABASE_URL', env),
    databaseServiceRoleKey: getRequiredEnv('RAG_DATABASE_SERVICE_ROLE_KEY', env),
    embeddingApiKey: getRequiredEnv('EMBEDDING_API_KEY', env),
    embeddingModel: getRequiredEnv('EMBEDDING_MODEL', env),
    fallbackEmbeddingModel: getRequiredEnv('FALLBACK_EMBEDDING_MODEL', env),
    embeddingDimensions: getRequiredNumberEnv('EMBEDDING_DIMENSIONS', env),
    fallbackEmbeddingDimensions: getRequiredNumberEnv('FALLBACK_EMBEDDING_DIMENSIONS', env),
    embeddingRequestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS', env),
    aiModelApiKey: getRequiredEnv('AI_MODEL_API_KEY', env),
    aiModel: getRequiredEnv('AI_MODEL', env),
    altchaHmacKey: getRequiredEnv('ALTCHA_HMAC_KEY', env),
    altchaCost: getPositiveNumberEnv(env, 'ALTCHA_COST', 2_000),
    altchaCounterMin: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MIN', 1_000),
    altchaCounterMax: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MAX', 3_000),
    askRateLimitPerMinute: getPositiveNumberEnv(env, 'RAG_ASK_RATE_LIMIT_PER_MINUTE', 6),
    askRateLimitPerDay: getPositiveNumberEnv(env, 'RAG_ASK_RATE_LIMIT_PER_DAY', 30),
    askGlobalRateLimitPerDay: getPositiveNumberEnv(env, 'RAG_ASK_GLOBAL_RATE_LIMIT_PER_DAY', 500),
    askRateLimitSalt: env.RAG_ASK_RATE_LIMIT_SALT || 'arg-ask-rate-limit',
  };
}

export function getSiteConfig(env: IEnvSource = process.env): ISiteConfig {
  return {
    siteUrl: getRequiredEnv('RAG_SITE_URL', env),
    companyName: getRequiredEnv('RAG_COMPANY_NAME', env),
  };
}

export function getChunkingConfig(env: IEnvSource = process.env): IChunkingConfig {
  return {
    chunkSize: getRequiredNumberEnv('RAG_CHUNK_SIZE', env),
    chunkOverlap: getRequiredNumberEnv('RAG_CHUNK_OVERLAP', env),
  };
}

export function getRetrievalConfig(env: IEnvSource = process.env): IRetrievalConfig {
  return {
    matchCount: getRequiredNumberEnv('RAG_MATCH_COUNT', env),
    similarityThreshold: getRequiredNumberEnv('RAG_SIMILARITY_THRESHOLD', env),
    fallbackSimilarityThreshold: getRequiredNumberEnv('RAG_FALLBACK_SIMILARITY_THRESHOLD', env),
  };
}

function getPositiveNumberEnv(env: IEnvSource, name: string, fallback: number): number {
  const value = Number(env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}
