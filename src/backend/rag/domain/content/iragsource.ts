export type RagSourceMetadata = Record<string, unknown>;

export type RagSourceOrigin = 'first_party' | 'trusted_external';

export type RagSourceType =
  | 'homepage'
  | 'about'
  | 'project'
  | 'partner'
  | 'careers'
  | 'working_with_us'
  | 'faq'
  | 'blog_post'
  | 'local_document'
  | 'external_page';

export interface IRagSource {
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url?: string;
  path?: string;
  origin: RagSourceOrigin;
  isPublic: boolean;
  metadata?: RagSourceMetadata;
  content: string;
  chunks?: string[];
  chunkMetadata?: RagSourceMetadata;
}
