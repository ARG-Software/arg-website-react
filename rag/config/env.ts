import { config as loadDotenv } from 'dotenv';

interface EnvOptions {
  required?: boolean;
}

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

export function validateRequiredEnv(): void {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getRequiredEnv(name: string): string {
  return getEnv(name, { required: true }) as string;
}

export function getRequiredNumberEnv(name: string): number {
  return getNumberEnv(name, { required: true }) as number;
}
