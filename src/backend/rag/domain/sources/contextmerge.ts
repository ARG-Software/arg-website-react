import type { IRetrievedContext } from './retrievedcontext.types.js';

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

export function mergePrioritizedContexts(
  contextGroups: IRetrievedContext[][],
  matchCount: number
): IRetrievedContext[] {
  const contextsByChunk = new Map<string, IRetrievedContext>();

  for (const context of contextGroups.flat()) {
    if (!contextsByChunk.has(context.chunkId)) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}
