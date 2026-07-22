const DEFAULTS = {
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
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

export function getEnv(name, options = {}) {
  const value = process.env[name] ?? DEFAULTS[name];

  if (!value && options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getNumberEnv(name, options = {}) {
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

export function getRagConfig() {
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

export function getSupabaseConfig() {
  return {
    supabaseUrl: getEnv('SUPABASE_URL', { required: true }),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY', { required: true }),
  };
}

export function getGeminiConfig() {
  return {
    geminiApiKey: getEnv('GEMINI_API_KEY', { required: true }),
    geminiEmbeddingModel: getEnv('GEMINI_EMBEDDING_MODEL'),
  };
}

export function getDeepSeekConfig() {
  return {
    deepseekApiKey: getEnv('DEEPSEEK_API_KEY', { required: true }),
    deepseekModel: getEnv('DEEPSEEK_MODEL'),
  };
}

export function getSiteConfig() {
  return {
    siteUrl: getEnv('RAG_SITE_URL'),
    companyName: getEnv('RAG_COMPANY_NAME'),
  };
}

export function getChunkingConfig() {
  return {
    chunkSize: getNumberEnv('RAG_CHUNK_SIZE'),
    chunkOverlap: getNumberEnv('RAG_CHUNK_OVERLAP'),
  };
}

export function getRetrievalConfig() {
  return {
    matchCount: getNumberEnv('RAG_MATCH_COUNT'),
    similarityThreshold: getNumberEnv('RAG_SIMILARITY_THRESHOLD'),
  };
}

export function validateRequiredEnv() {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
