import { createHash } from 'node:crypto';

import type { RagSource } from '../../../domain/content/RagSource.js';

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

export function createSourceHash(source: RagSource): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        sourceType: source.sourceType,
        sourceKey: source.sourceKey,
        title: source.title,
        url: source.url ?? null,
        path: source.path ?? null,
        origin: source.origin,
        isPublic: source.isPublic,
        metadata: sortHashValue(source.metadata ?? {}),
        chunkMetadata: sortHashValue(source.chunkMetadata ?? {}),
        content: normalizeText(source.content),
      })
    )
    .digest('hex');
}

function sortHashValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortHashValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, sortHashValue(nestedValue)])
  );
}
