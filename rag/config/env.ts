import type { RagConfig } from '../types/config.js';

const DEFAULTS: Record<string, string> = {
  GEMINI_EMBEDDING_MODEL: 'gemini-embedding-2',
  GEMINI_EMBEDDING_DIMENSIONS: '768',
  GEMINI_EMBEDDING_REQUEST_DELAY_MS: '750',
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  RAG_SITE_URL: 'https://arg.software',
  RAG_COMPANY_NAME: 'ARG Software',
  RAG_CHUNK_SIZE: '1200',
  RAG_CHUNK_OVERLAP: '180',
  RAG_MATCH_COUNT: '6',
  RAG_SIMILARITY_THRESHOLD: '0.72',
};

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
];

interface EnvOptions {
  required?: boolean;
}

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

export function getRagConfig(): RagConfig {
  validateRequiredEnv();

  return {
    ...getSupabaseConfig(),
    ...getGeminiConfig(),
    ...getDeepSeekConfig(),
    ...getSiteConfig(),
    ...getChunkingConfig(),
    ...getRetrievalConfig(),
  };
}

export function getSupabaseConfig(): Pick<RagConfig, 'supabaseUrl' | 'supabaseServiceRoleKey'> {
  return {
    supabaseUrl: getRequiredEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export function getGeminiConfig(): Pick<
  RagConfig,
  | 'geminiApiKey'
  | 'geminiEmbeddingModel'
  | 'geminiEmbeddingDimensions'
  | 'geminiEmbeddingRequestDelayMs'
> {
  return {
    geminiApiKey: getRequiredEnv('GEMINI_API_KEY'),
    geminiEmbeddingModel: getRequiredEnv('GEMINI_EMBEDDING_MODEL'),
    geminiEmbeddingDimensions: getRequiredNumberEnv('GEMINI_EMBEDDING_DIMENSIONS'),
    geminiEmbeddingRequestDelayMs: getRequiredNumberEnv('GEMINI_EMBEDDING_REQUEST_DELAY_MS'),
  };
}

export function getDeepSeekConfig(): Pick<RagConfig, 'deepseekApiKey' | 'deepseekModel'> {
  return {
    deepseekApiKey: getRequiredEnv('DEEPSEEK_API_KEY'),
    deepseekModel: getRequiredEnv('DEEPSEEK_MODEL'),
  };
}

export function getSiteConfig(): Pick<RagConfig, 'siteUrl' | 'companyName'> {
  return {
    siteUrl: getRequiredEnv('RAG_SITE_URL'),
    companyName: getRequiredEnv('RAG_COMPANY_NAME'),
  };
}

export function getChunkingConfig(): Pick<RagConfig, 'chunkSize' | 'chunkOverlap'> {
  return {
    chunkSize: getRequiredNumberEnv('RAG_CHUNK_SIZE'),
    chunkOverlap: getRequiredNumberEnv('RAG_CHUNK_OVERLAP'),
  };
}

export function getRetrievalConfig(): Pick<RagConfig, 'matchCount' | 'similarityThreshold'> {
  return {
    matchCount: getRequiredNumberEnv('RAG_MATCH_COUNT'),
    similarityThreshold: getRequiredNumberEnv('RAG_SIMILARITY_THRESHOLD'),
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
