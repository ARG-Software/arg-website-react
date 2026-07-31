import { config as loadDotenv } from 'dotenv';

import type {
  ChunkingConfig,
  DeepSeekConfig,
  EnvOptions,
  GeminiEmbeddingConfig,
  RagConfig,
  RetrievalConfig,
  SiteConfig,
  SupabaseConfig,
} from '../core/types/config.js';

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
  'DATABASE_URL',
  'DATABASE_SERVICE_ROLE_KEY',
  'EMBEDDING_API_KEY',
  'EMBEDDING_MODEL',
  'FALLBACK_EMBEDDING_MODEL',
  'AI_MODEL_API_KEY',
  'AI_MODEL',
];

export function getEnv(name: string, options: EnvOptions = {}): string | undefined {
  const value = process.env[name] ?? DEFAULTS[name];

  if (!value && options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getNumberEnv(name: string, options: EnvOptions = {}): number | undefined {
  const value = getEnv(name, options);

  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return number;
}

export function loadLocalEnv(path = '.env'): Record<string, string> {
  const result = loadDotenv({ path, quiet: true });

  if (result.error) {
    throw result.error;
  }

  return result.parsed ?? {};
}

export function getRagConfig(): RagConfig {
  validateRequiredEnv();

  return {
    ...getSupabaseConfig(),
    ...getGeminiConfig(),
    ...getGeminiFallbackEmbeddingConfig(),
    ...getDeepSeekConfig(),
    ...getSiteConfig(),
    ...getChunkingConfig(),
    ...getRetrievalConfig(),
  };
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    supabaseUrl: getRequiredEnv('DATABASE_URL'),
    supabaseServiceRoleKey: getRequiredEnv('DATABASE_SERVICE_ROLE_KEY'),
  };
}

export function getGeminiConfig(): Pick<
  GeminiEmbeddingConfig,
  'geminiApiKey' | 'geminiEmbeddingModel' | 'geminiEmbeddingDimensions' | 'geminiEmbeddingRequestDelayMs'
> {
  return {
    geminiApiKey: getRequiredEnv('EMBEDDING_API_KEY'),
    geminiEmbeddingModel: getRequiredEnv('EMBEDDING_MODEL'),
    geminiEmbeddingDimensions: getRequiredNumberEnv('EMBEDDING_DIMENSIONS'),
    geminiEmbeddingRequestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS'),
  };
}

export function getGeminiFallbackEmbeddingConfig(): Pick<
  GeminiEmbeddingConfig,
  | 'geminiApiKey'
  | 'geminiFallbackEmbeddingModel'
  | 'geminiFallbackEmbeddingDimensions'
  | 'geminiEmbeddingRequestDelayMs'
> {
  return {
    geminiApiKey: getRequiredEnv('EMBEDDING_API_KEY'),
    geminiFallbackEmbeddingModel: getRequiredEnv('FALLBACK_EMBEDDING_MODEL'),
    geminiFallbackEmbeddingDimensions: getRequiredNumberEnv('FALLBACK_EMBEDDING_DIMENSIONS'),
    geminiEmbeddingRequestDelayMs: getRequiredNumberEnv('EMBEDDING_REQUEST_DELAY_MS'),
  };
}

export function getDeepSeekConfig(): DeepSeekConfig {
  return {
    deepseekApiKey: getRequiredEnv('AI_MODEL_API_KEY'),
    deepseekModel: getRequiredEnv('AI_MODEL'),
  };
}

export function getSiteConfig(): SiteConfig {
  return {
    siteUrl: getRequiredEnv('RAG_SITE_URL'),
    companyName: getRequiredEnv('RAG_COMPANY_NAME'),
  };
}

export function getChunkingConfig(): ChunkingConfig {
  return {
    chunkSize: getRequiredNumberEnv('RAG_CHUNK_SIZE'),
    chunkOverlap: getRequiredNumberEnv('RAG_CHUNK_OVERLAP'),
  };
}

export function getRetrievalConfig(): RetrievalConfig {
  return {
    matchCount: getRequiredNumberEnv('RAG_MATCH_COUNT'),
    similarityThreshold: getRequiredNumberEnv('RAG_SIMILARITY_THRESHOLD'),
    fallbackSimilarityThreshold: getRequiredNumberEnv('RAG_FALLBACK_SIMILARITY_THRESHOLD'),
  };
}

export function validateRequiredEnv(): void {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function getRequiredEnv(name: string): string {
  return getEnv(name, { required: true }) as string;
}

function getRequiredNumberEnv(name: string): number {
  return getNumberEnv(name, { required: true }) as number;
}
