import type { RagSourceOrigin, RagSourceType } from '../../domain/content/RagSource.js';
import type { RetrievedContext } from '../../domain/retrieval/RetrievedContext.js';

export function createContextFixture(
  sourceType: RagSourceType,
  sourceKey: string,
  title: string,
  content: string,
  origin: RagSourceOrigin = 'first_party'
): RetrievedContext {
  return {
    chunkId: `chunk-${sourceKey}`,
    sourceId: `source-${sourceKey}`,
    sourceType,
    sourceKey,
    title,
    url: `/blog/${sourceKey}/`,
    path: null,
    chunkIndex: 0,
    content,
    similarity: 0.9,
    sourceMetadata: {},
    chunkMetadata: {},
    origin,
  };
}
