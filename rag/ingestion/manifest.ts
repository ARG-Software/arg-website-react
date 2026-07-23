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

export interface PdfManifestEntry extends RagSourceMetadata {
  filePath?: string;
  sourceKey?: string;
  title?: string;
  url?: string;
}

export interface ValidatedPdfManifestEntry extends PdfManifestEntry {
  filePath: string;
  sourceKey: string;
  title: string;
  url: string;
}

export interface ExternalSourceManifestEntry {
  url: string;
  title?: string;
  trusted?: boolean;
}

export interface FileManifestEntry {
  kind: 'projects_json' | 'partners_json' | 'markdown_dir' | 'pdf_manifest';
  filePath: string;
}

export type InternalManifestEntry = JsonManifestEntry | FileManifestEntry;
