import { createRagError } from '../../application/errors.js';
import type {
  IChunkingConfig,
  IRagConfig,
  IRagConfiguration,
  IRetrievalConfig,
  ISiteConfig,
} from '../../application/config/IRagConfiguration.js';
import type { IRateLimitConfig } from '../../../shared/security/rateLimit.js';
import type { AltchaSettings } from '../../../shared/security/altcha.js';

const DEFAULT_ASK_RATE_LIMIT_SALT = 'arg-ask-rate-limit';

const DEFAULTS: Record<string, string> = {
  EMBEDDING_DIMENSIONS: '768',
  FALLBACK_EMBEDDING_DIMENSIONS: '768',
  EMBEDDING_REQUEST_DELAY_MS: '750',
  RAG_SITE_URL: 'https://arg.software',
  RAG_COMPANY_NAME: 'ARG Software',
  RAG_CHUNK_SIZE: '1200',
  RAG_CHUNK_OVERLAP: '180',
  RAG_MATCH_COUNT: '6',
  RAG_SIMILARITY_THRESHOLD: '0.72',
  RAG_FALLBACK_SIMILARITY_THRESHOLD: '0.60',
};

const REQUIRED_ENV = [
  'RAG_DATABASE_URL',
  'RAG_DATABASE_SERVICE_ROLE_KEY',
  'EMBEDDING_API_KEY',
  'EMBEDDING_MODEL',
  'FALLBACK_EMBEDDING_MODEL',
  'AI_MODEL_API_KEY',
  'AI_MODEL',
  'ALTCHA_HMAC_KEY',
];

export class RagConfig implements IRagConfiguration {
  private static instance: RagConfig | null = null;

  private values: IRagConfig;

  private constructor(values: IRagConfig) {
    this.values = { ...values };
  }

  static load(env: NodeJS.ProcessEnv = process.env): RagConfig {
    if (!RagConfig.instance) {
      RagConfig.instance = new RagConfig(readRagConfigValues(env));
    }

    return RagConfig.instance;
  }

  static configure(values: IRagConfig): RagConfig {
    if (!RagConfig.instance) {
      RagConfig.instance = new RagConfig(values);
      return RagConfig.instance;
    }

    RagConfig.instance.setValues(values);
    return RagConfig.instance;
  }

  static reset(): void {
    RagConfig.instance = null;
  }

  setValues(values: IRagConfig): void {
    this.values = { ...values };
  }

  getRagConfig(): IRagConfig {
    return { ...this.values };
  }

  getDatabaseUrl(): string {
    return this.values.databaseUrl;
  }

  getDatabaseServiceRoleKey(): string {
    return this.values.databaseServiceRoleKey;
  }

  getEmbeddingApiKey(): string {
    return this.values.embeddingApiKey;
  }

  getEmbeddingModel(): string {
    return this.values.embeddingModel;
  }

  getFallbackEmbeddingModel(): string {
    return this.values.fallbackEmbeddingModel;
  }

  getEmbeddingDimensions(): number {
    return this.values.embeddingDimensions;
  }

  getFallbackEmbeddingDimensions(): number {
    return this.values.fallbackEmbeddingDimensions;
  }

  getEmbeddingRequestDelayMs(): number {
    return this.values.embeddingRequestDelayMs;
  }

  getAiModelApiKey(): string {
    return this.values.aiModelApiKey;
  }

  getAiModel(): string {
    return this.values.aiModel;
  }

  getSiteConfig(): ISiteConfig {
    return {
      siteUrl: this.values.siteUrl,
      companyName: this.values.companyName,
    };
  }

  getChunkingConfig(): IChunkingConfig {
    return {
      chunkSize: this.values.chunkSize,
      chunkOverlap: this.values.chunkOverlap,
    };
  }

  getRetrievalConfig(): IRetrievalConfig {
    return {
      matchCount: this.values.matchCount,
      similarityThreshold: this.values.similarityThreshold,
      fallbackSimilarityThreshold: this.values.fallbackSimilarityThreshold,
    };
  }

  getAltchaSettings(): AltchaSettings {
    return {
      altchaHmacKey: this.values.altchaHmacKey,
      altchaCost: this.values.altchaCost,
      altchaCounterMin: this.values.altchaCounterMin,
      altchaCounterMax: this.values.altchaCounterMax,
    };
  }

  getAskRateLimitConfig(): IRateLimitConfig {
    return {
      perMinute: this.values.askRateLimitPerMinute,
      perDay: this.values.askRateLimitPerDay,
      globalDaily: this.values.askGlobalRateLimitPerDay,
      salt: this.values.askRateLimitSalt,
    };
  }
}

export function readRagConfigValues(env: NodeJS.ProcessEnv): IRagConfig {
  validateRequiredEnv(env);

  return {
    siteUrl: requiredEnv(env, 'RAG_SITE_URL'),
    companyName: requiredEnv(env, 'RAG_COMPANY_NAME'),
    chunkSize: requiredNumberEnv(env, 'RAG_CHUNK_SIZE'),
    chunkOverlap: requiredNumberEnv(env, 'RAG_CHUNK_OVERLAP'),
    matchCount: requiredNumberEnv(env, 'RAG_MATCH_COUNT'),
    similarityThreshold: requiredNumberEnv(env, 'RAG_SIMILARITY_THRESHOLD'),
    fallbackSimilarityThreshold: requiredNumberEnv(env, 'RAG_FALLBACK_SIMILARITY_THRESHOLD'),
    databaseUrl: requiredEnv(env, 'RAG_DATABASE_URL'),
    databaseServiceRoleKey: requiredEnv(env, 'RAG_DATABASE_SERVICE_ROLE_KEY'),
    embeddingApiKey: requiredEnv(env, 'EMBEDDING_API_KEY'),
    embeddingModel: requiredEnv(env, 'EMBEDDING_MODEL'),
    fallbackEmbeddingModel: requiredEnv(env, 'FALLBACK_EMBEDDING_MODEL'),
    embeddingDimensions: requiredNumberEnv(env, 'EMBEDDING_DIMENSIONS'),
    fallbackEmbeddingDimensions: requiredNumberEnv(env, 'FALLBACK_EMBEDDING_DIMENSIONS'),
    embeddingRequestDelayMs: requiredNumberEnv(env, 'EMBEDDING_REQUEST_DELAY_MS'),
    aiModelApiKey: requiredEnv(env, 'AI_MODEL_API_KEY'),
    aiModel: requiredEnv(env, 'AI_MODEL'),
    altchaHmacKey: requiredEnv(env, 'ALTCHA_HMAC_KEY'),
    altchaCost: getPositiveNumberEnv(env, 'ALTCHA_COST', 2_000),
    altchaCounterMin: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MIN', 1_000),
    altchaCounterMax: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MAX', 3_000),
    askRateLimitPerMinute: getPositiveNumberEnv(env, 'RAG_ASK_RATE_LIMIT_PER_MINUTE', 6),
    askRateLimitPerDay: getPositiveNumberEnv(env, 'RAG_ASK_RATE_LIMIT_PER_DAY', 30),
    askGlobalRateLimitPerDay: getPositiveNumberEnv(env, 'RAG_ASK_GLOBAL_RATE_LIMIT_PER_DAY', 500),
    askRateLimitSalt: env.RAG_ASK_RATE_LIMIT_SALT || DEFAULT_ASK_RATE_LIMIT_SALT,
  };
}

function validateRequiredEnv(env: NodeJS.ProcessEnv): void {
  const missing = REQUIRED_ENV.filter(name => !env[name]);

  if (missing.length > 0) {
    throw createRagError(
      503,
      'configuration_error',
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name] ?? DEFAULTS[name];

  if (!value) {
    throw createRagError(503, 'configuration_error', `Missing required environment variable: ${name}`);
  }

  return value;
}

function requiredNumberEnv(env: NodeJS.ProcessEnv, name: string): number {
  const value = requiredEnv(env, name);
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createRagError(503, 'configuration_error', `Environment variable ${name} must be a number`);
  }

  return number;
}

function getPositiveNumberEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = Number(env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}
