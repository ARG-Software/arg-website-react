export interface RagConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  geminiEmbeddingModel: string;
  geminiEmbeddingDimensions: number;
  geminiEmbeddingRequestDelayMs: number;
  deepseekApiKey: string;
  deepseekModel: string;
  siteUrl: string;
  companyName: string;
  chunkSize: number;
  chunkOverlap: number;
  matchCount: number;
  similarityThreshold: number;
}
