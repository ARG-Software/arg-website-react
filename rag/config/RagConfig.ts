export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface GeminiEmbeddingConfig {
  geminiApiKey: string;
  geminiEmbeddingModel: string;
  geminiEmbeddingDimensions: number;
  geminiFallbackEmbeddingModel: string;
  geminiFallbackEmbeddingDimensions: number;
  geminiEmbeddingRequestDelayMs: number;
}

export interface DeepSeekConfig {
  deepseekApiKey: string;
  deepseekModel: string;
}

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

export interface RagConfig
  extends SupabaseConfig,
    GeminiEmbeddingConfig,
    DeepSeekConfig,
    SiteConfig,
    ChunkingConfig,
    RetrievalConfig {}

export interface EnvOptions {
  required?: boolean;
}
