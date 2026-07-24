import type { RagSourceMetadata, RagSourceType } from '../types/source.js';

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

export interface LocalDocumentManifestEntry extends RagSourceMetadata {
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
  kind: 'projects_json' | 'partners_json' | 'markdown_dir' | 'local_document_manifest';
  filePath: string;
}

export type LocalManifestEntry = JsonManifestEntry | FileManifestEntry;
