import { getRequiredEnv, getRequiredNumberEnv, validateRequiredEnv } from '../config/env.js';

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

export function getRagConfig(): RagConfig {
  validateRequiredEnv();

  return {
    ...getSiteConfig(),
    ...getChunkingConfig(),
    ...getRetrievalConfig(),
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
