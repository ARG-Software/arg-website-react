import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import { resolveUrl } from '../shared/url.js';
import type { RagChunkRecord } from '../ports/iragchunk.repository.js';
import type { RagMatchedChunkRecord } from '../ports/iragchunksearch.repository.js';
import type { RagSourceRecord } from '../ports/iragsource.repository.js';

export function createContextsFromFirstChunks(
  sources: RagSourceRecord[],
  chunks: RagChunkRecord[],
  siteUrl: string
): IRetrievedContext[] {
  const chunksBySourceId = new Map(chunks.map(chunk => [chunk.sourceId, chunk]));

  return sources.flatMap(source => {
    const chunk = chunksBySourceId.get(source.id);
    return chunk ? [createContextFromSourceChunk(source, chunk, siteUrl)] : [];
  });
}

export function createContextFromMatchedChunk(
  chunk: RagMatchedChunkRecord,
  siteUrl: string
): IRetrievedContext {
  return {
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    sourceType: chunk.sourceType,
    sourceKey: chunk.sourceKey,
    title: chunk.title,
    url: resolveUrl(chunk.url, siteUrl),
    path: chunk.path,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    similarity: chunk.similarity,
    sourceMetadata: chunk.sourceMetadata ?? {},
    chunkMetadata: chunk.chunkMetadata ?? {},
    origin: chunk.origin,
  };
}

function createContextFromSourceChunk(
  source: RagSourceRecord,
  chunk: RagChunkRecord,
  siteUrl: string
): IRetrievedContext {
  return {
    chunkId: chunk.id,
    sourceId: source.id,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    url: resolveUrl(source.url, siteUrl),
    path: source.path,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    similarity: 1,
    sourceMetadata: source.metadata ?? {},
    chunkMetadata: chunk.metadata ?? {},
    origin: source.origin,
  };
}
