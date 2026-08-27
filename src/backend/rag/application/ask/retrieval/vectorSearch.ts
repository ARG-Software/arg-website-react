import type { IRagConfig } from '../../config/IRagConfiguration.js';
import type { IRetrievedContext } from '../../../domain/retrieval/IRetrievedContext.js';
import type { EmbeddingIndex } from '../../ports/EmbeddingIndex.js';
import type { RagSourceOrigin, RagSourceType } from '../../../domain/content/IRagSource.js';
import type { IRagReadRepository } from '../../ports/IRagReadRepository.js';

export interface IRetrieveContextsInput {
  repository: IRagReadRepository;
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

  if (
    highConfidenceContexts.length >= config.matchCount ||
    config.fallbackSimilarityThreshold >= config.similarityThreshold
  ) {
    return highConfidenceContexts;
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

  return mergeContexts([highConfidenceContexts, fallbackContexts], config.matchCount);
}

export function mergeRetrievedContexts(
  contextGroups: IRetrievedContext[][],
  matchCount: number
): IRetrievedContext[] {
  const contextsByChunk = new Map<string, IRetrievedContext>();

  for (const context of contextGroups.flat()) {
    const current = contextsByChunk.get(context.chunkId);
    if (!current || context.similarity > current.similarity) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}

export function mergeContexts(
  contextGroups: IRetrievedContext[][],
  matchCount: number
): IRetrievedContext[] {
  const contexts = contextGroups.flat();
  const uniqueContexts = new Map<string, IRetrievedContext>();

  for (const context of contexts) {
    const current = uniqueContexts.get(context.chunkId);
    if (!current || context.similarity > current.similarity) {
      uniqueContexts.set(context.chunkId, context);
    }
  }

  return Array.from(uniqueContexts.values())
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, matchCount);
}

export function mergeComplementaryContexts(
  contextGroups: IRetrievedContext[][],
  matchCount: number
): IRetrievedContext[] {
  const sortedGroups = contextGroups
    .map(contexts => mergeContexts([contexts], matchCount))
    .filter(contexts => contexts.length > 0);
  const leadingContexts = sortedGroups.map(contexts => contexts[0]);
  const remainingContexts = sortedGroups.map(contexts => contexts.slice(1));

  return mergeContexts([leadingContexts, ...remainingContexts], matchCount);
}
