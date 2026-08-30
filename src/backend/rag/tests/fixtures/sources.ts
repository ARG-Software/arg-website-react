import type { RagSourceMetadata, RagSourceType } from '../../domain/sources/ragsource.types.js';
import type { RagSourceRecord } from '../../application/ports/iragsource.repository.js';

export interface IChunkFixture {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: RagSourceMetadata;
}

export function createSourceFixture(
  id: string,
  title: string,
  date: string | null,
  sourceType: RagSourceType = 'blog_post',
  sourceKey = id,
  metadata: Record<string, unknown> = {}
): RagSourceRecord {
  return {
    id,
    sourceType,
    sourceKey,
    title,
    url: `/blog/${sourceKey}/`,
    path: null,
    origin: 'first_party',
    isPublic: true,
    metadata: { ...(date ? { date } : {}), ...metadata },
    contentHash: null,
  };
}

export function createChunkFixture(
  sourceId: string,
  suffix: string,
  content = `Blog post ${suffix}`
): IChunkFixture {
  return {
    id: `chunk-${suffix}`,
    sourceId,
    chunkIndex: 0,
    content,
    metadata: {},
  };
}
