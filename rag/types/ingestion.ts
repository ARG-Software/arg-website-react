export type RagSourceMetadata = Record<string, unknown>;

export type RagSourceType =
  | 'homepage'
  | 'about'
  | 'project'
  | 'partner'
  | 'careers'
  | 'working_with_us'
  | 'faq'
  | 'blog_post'
  | 'portfolio_pdf'
  | 'external_page';

export interface RagSource {
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url?: string;
  path?: string;
  metadata?: RagSourceMetadata;
  content: string;
  chunks?: string[];
  chunkMetadata?: RagSourceMetadata;
}

export interface IngestSourceResult {
  skipped: boolean;
  dryRun?: boolean;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  chunkCount: number;
  reason?: 'empty_content' | 'unchanged_content';
}

export interface RagSourceRepository {
  getSourceContentHash(source: Pick<RagSource, 'sourceType' | 'sourceKey'>): Promise<string | null>;
  upsertSource(
    source: RagSource,
    embeddings: number[][]
  ): Promise<{ sourceId: string | null; chunkCount: number }>;
}
