import type { RagSourceMetadata, RagSourceType } from '../../domain/content/IRagSource.js';
import type { IRagSourceRecord } from '../../application/ports/IRagReadRepository.js';

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
): IRagSourceRecord {
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
