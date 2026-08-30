import type { RagSourceOrigin, RagSourceType } from '../../domain/sources/ragsource.types.js';
import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';

export function createContextFixture(
  sourceType: RagSourceType,
  sourceKey: string,
  title: string,
  content: string,
  origin: RagSourceOrigin = 'first_party'
): IRetrievedContext {
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
