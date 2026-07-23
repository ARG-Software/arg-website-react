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
