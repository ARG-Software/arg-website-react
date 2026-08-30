import type { IRagConfig } from '../config/irag.configuration.js';
import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import { mergeContexts } from '../../domain/sources/contextmerge.js';
import type { EmbeddingIndex, RagSourceOrigin, RagSourceType } from '../../domain/sources/ragsource.types.js';
import type { IRagChunkSearchRepository } from '../ports/iragchunksearch.repository.js';
import { createContextFromMatchedChunk } from './contextsmapper.js';

export interface IRetrieveContextsInput {
  repository: IRagChunkSearchRepository;
  embedding: number[];
  index: EmbeddingIndex;
  config: IRagConfig;
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
}
export async function retrieveContextsForOrigin({
  repository,
  embedding,
  index,
  config,
  sourceOrigin,
  sourceTypes = null,
  sourceKeys = null,
}: IRetrieveContextsInput): Promise<IRetrievedContext[]> {
  const highConfidenceContexts = await repository.matchChunks({
    embedding,
    index,
    matchCount: config.matchCount,
    similarityThreshold: config.similarityThreshold,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
  });

  const highConfidence = highConfidenceContexts.map(context =>
    createContextFromMatchedChunk(context, config.siteUrl)
  );

  if (
    highConfidenceContexts.length >= config.matchCount ||
    config.fallbackSimilarityThreshold >= config.similarityThreshold
  ) {
    return highConfidence;
  }

  const fallbackContexts = await repository.matchChunks({
    embedding,
    index,
    matchCount: config.matchCount,
    similarityThreshold: config.fallbackSimilarityThreshold,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
  });

  return mergeContexts(
    [highConfidence, fallbackContexts.map(context => createContextFromMatchedChunk(context, config.siteUrl))],
    config.matchCount
  );
}
