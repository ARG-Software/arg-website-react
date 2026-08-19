import {
  getRequiredEnv,
  getRequiredNumberEnv,
  validateRequiredEnv,
  type EnvSource,
} from '../config/env.js';

export interface SiteConfig {
  siteUrl: string;
  companyName: string;
}

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface RetrievalConfig {
  matchCount: number;
  similarityThreshold: number;
  fallbackSimilarityThreshold: number;
}

export interface RagConfig extends SiteConfig, ChunkingConfig, RetrievalConfig {}

export function getRagConfig(env: EnvSource = process.env): RagConfig {
  validateRequiredEnv(env);

  return {
    ...getSiteConfig(env),
    ...getChunkingConfig(env),
    ...getRetrievalConfig(env),
  };
}

export function getSiteConfig(env: EnvSource = process.env): SiteConfig {
  return {
    siteUrl: getRequiredEnv('RAG_SITE_URL', env),
    companyName: getRequiredEnv('RAG_COMPANY_NAME', env),
  };
}

export function getChunkingConfig(env: EnvSource = process.env): ChunkingConfig {
  return {
    chunkSize: getRequiredNumberEnv('RAG_CHUNK_SIZE', env),
    chunkOverlap: getRequiredNumberEnv('RAG_CHUNK_OVERLAP', env),
  };
}

export function getRetrievalConfig(env: EnvSource = process.env): RetrievalConfig {
  return {
    matchCount: getRequiredNumberEnv('RAG_MATCH_COUNT', env),
    similarityThreshold: getRequiredNumberEnv('RAG_SIMILARITY_THRESHOLD', env),
    fallbackSimilarityThreshold: getRequiredNumberEnv('RAG_FALLBACK_SIMILARITY_THRESHOLD', env),
  };
}
