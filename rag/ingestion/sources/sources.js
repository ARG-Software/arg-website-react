import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { flattenJsonToText } from './json.js';

export async function loadJsonSource(filePath, options) {
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

export function createSource(overrides) {
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
