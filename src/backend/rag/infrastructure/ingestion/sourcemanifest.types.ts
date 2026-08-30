import type { RagSourceMetadata, RagSourceType } from '../../domain/sources/ragsource.types.js';

export interface IJsonManifestEntry {
  kind: 'json';
  filePath: string;
  sourceType: RagSourceType;
  sourceKey?: string;
  dataKey?: string;
  title?: string;
  url?: string;
  label?: string;
  metadata?: RagSourceMetadata;
}

export interface IInlineJsonManifestEntry {
  kind: 'inline_json';
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url?: string;
  label?: string;
  virtualPath: string;
  content: unknown;
  metadata?: RagSourceMetadata;
}

export interface ILocalDocumentManifestEntry extends RagSourceMetadata {
  kind: 'local_document';
  format: 'pdf';
  filePath: string;
  sourceKey: string;
  title: string;
  citationUrl?: string;
  documentKind: 'portfolio' | 'cv';
  isPublic?: boolean;
  redaction?: ICvRedactionPolicy;
}

export interface ICvRedactionPolicy {
  profile: 'cv';
  manualReview: true;
  literals?: string[];
}

export interface IExternalSourceManifestEntry {
  sourceKey: string;
  url: string;
  title: string;
  snapshotPath?: string;
  trusted: true;
  extractor?: 'designRushCommercialFacts';
  extraction?: {
    projects?: Array<{
      projectName: string;
      sourceName: string;
    }>;
  };
}

export interface IFileManifestEntry {
  kind: 'projects_json' | 'partners_json' | 'markdown_dir';
  filePath: string;
}

export type LocalManifestEntry =
  | IJsonManifestEntry
  | IInlineJsonManifestEntry
  | IFileManifestEntry
  | ILocalDocumentManifestEntry;
