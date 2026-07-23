import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { RagSource, RagSourceMetadata, RagSourceType } from '../../types/ingestion.js';
import { flattenJsonToText } from './json.js';

export interface JsonSourceOptions {
  sourceType: RagSourceType;
  sourceKey?: string;
  title?: string;
  url?: string;
  label?: string;
  metadata?: RagSourceMetadata;
}

export async function loadJsonSource(filePath: string, options: JsonSourceOptions): Promise<RagSource> {
  const json = JSON.parse(await readFile(filePath, 'utf8'));
  const sourceKey = options.sourceKey ?? path.basename(filePath, path.extname(filePath));

  return {
    sourceType: options.sourceType,
    sourceKey,
    title: options.title ?? sourceKey,
    url: options.url,
    path: filePath,
    metadata: {
      ...(options.metadata ?? {}),
      source_file: filePath,
    },
    content: flattenJsonToText(json, options.label),
  };
}

export function createSource(overrides: Partial<RagSource> & Pick<RagSource, 'sourceType' | 'sourceKey' | 'title'>): RagSource {
  if (!overrides.sourceType || !overrides.sourceKey || !overrides.title) {
    throw new Error('RAG sources require sourceType, sourceKey, and title');
  }

  return {
    url: undefined,
    path: undefined,
    metadata: {},
    content: '',
    ...overrides,
  };
}
