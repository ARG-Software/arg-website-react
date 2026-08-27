import type { IRateLimitConfig } from '../../../shared/security/rateLimit.js';
import type { AltchaSettings } from '../../../shared/security/altcha.js';

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

export interface IRagConfiguration {
  getRagConfig(): IRagConfig;
  getDatabaseUrl(): string;
  getDatabaseServiceRoleKey(): string;
  getEmbeddingApiKey(): string;
  getEmbeddingModel(): string;
  getFallbackEmbeddingModel(): string;
  getEmbeddingDimensions(): number;
  getFallbackEmbeddingDimensions(): number;
  getEmbeddingRequestDelayMs(): number;
  getAiModelApiKey(): string;
  getAiModel(): string;
  getSiteConfig(): ISiteConfig;
  getChunkingConfig(): IChunkingConfig;
  getRetrievalConfig(): IRetrievalConfig;
  getAltchaSettings(): AltchaSettings;
  getAskRateLimitConfig(): IRateLimitConfig;
}
