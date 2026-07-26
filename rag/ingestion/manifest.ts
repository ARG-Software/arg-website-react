import type { RagSourceMetadata, RagSourceType } from '../core/types/source.js';

export interface JsonManifestEntry {
  kind: 'json';
  filePath: string;
  sourceType: RagSourceType;
  sourceKey?: string;
  title?: string;
  url?: string;
  label?: string;
  metadata?: RagSourceMetadata;
}

export interface InlineJsonManifestEntry {
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

export interface LocalDocumentManifestEntry extends RagSourceMetadata {
  kind: 'local_document';
  format: 'pdf';
  filePath: string;
  sourceKey: string;
  title: string;
  citationUrl?: string;
  documentKind: 'portfolio' | 'cv';
  isPublic?: boolean;
  redaction?: CvRedactionPolicy;
}

export interface CvRedactionPolicy {
  profile: 'cv';
  manualReview: true;
  literals?: string[];
}

export interface ExternalSourceManifestEntry {
  sourceKey: string;
  url: string;
  title: string;
  snapshotPath?: string;
  trusted: true;
}

export interface FileManifestEntry {
  kind: 'projects_json' | 'partners_json' | 'markdown_dir';
  filePath: string;
}

export type LocalManifestEntry =
  | JsonManifestEntry
  | InlineJsonManifestEntry
  | FileManifestEntry
  | LocalDocumentManifestEntry;
