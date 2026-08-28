import { createHash } from 'node:crypto';

import type { IRagSource } from '../../../domain/content/iragsource.js';

const HASH_IGNORED_METADATA_KEYS = new Set(['source_file', 'source_files']);

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripMarkdown(value: unknown): string {
  return normalizeText(value)
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim();
}

export function createSourceHash(source: IRagSource): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        schemaVersion: 2,
        sourceType: source.sourceType,
        sourceKey: source.sourceKey,
        title: source.title,
        url: source.url ?? null,
        origin: source.origin,
        isPublic: source.isPublic,
        metadata: stableHashValue(source.metadata ?? {}),
        chunkMetadata: stableHashValue(source.chunkMetadata ?? {}),
        content: normalizeText(source.content),
      })
    )
    .digest('hex');
}

function stableHashValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableHashValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !HASH_IGNORED_METADATA_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, stableHashValue(nestedValue)])
  );
}
