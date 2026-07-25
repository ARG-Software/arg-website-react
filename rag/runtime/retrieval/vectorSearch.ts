import type { SupabaseClient } from '@supabase/supabase-js';

import type { RetrievedContext } from '../../types/ai.js';
import type { RagConfig } from '../../types/config.js';
import type { RagSourceOrigin, RagSourceType } from '../../types/source.js';
import { toEmbeddingLiteral } from '../../utils/embeddings.js';
import { resolveUrl } from '../url.js';
import type { MatchFunction, MatchRagChunkRow } from './types.js';

interface PreferredContextsInput {
  supabase: SupabaseClient;
  embedding: number[];
  config: RagConfig;
  matchFunction: MatchFunction;
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  similarityThreshold: number;
}

type MatchChunksInput = PreferredContextsInput;

export async function retrieveContextsForOrigin({
  supabase,
  embedding,
  config,
  matchFunction,
  sourceOrigin,
  sourceTypes = null,
  sourceKeys = null,
}: Omit<PreferredContextsInput, 'similarityThreshold'>): Promise<RetrievedContext[]> {
  const highConfidenceContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    matchFunction,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
    similarityThreshold: config.similarityThreshold,
  });

  if (
    highConfidenceContexts.length >= config.matchCount ||
    config.fallbackSimilarityThreshold >= config.similarityThreshold
  ) {
    return highConfidenceContexts;
  }

  const fallbackContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    matchFunction,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
    similarityThreshold: config.fallbackSimilarityThreshold,
  });

  return mergeContexts([highConfidenceContexts, fallbackContexts], config.matchCount);
}

export function mergeContexts(
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const contexts = contextGroups.flat();
  const uniqueContexts = new Map<string, RetrievedContext>();

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
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const sortedGroups = contextGroups
    .map(contexts => mergeContexts([contexts], matchCount))
    .filter(contexts => contexts.length > 0);
  const leadingContexts = sortedGroups.map(contexts => contexts[0]);
  const remainingContexts = sortedGroups.map(contexts => contexts.slice(1));

  return mergeContexts([leadingContexts, ...remainingContexts], matchCount);
}

async function getPreferredContexts(input: PreferredContextsInput): Promise<RetrievedContext[]> {
  return matchChunks(input);
}

async function matchChunks({
  supabase,
  embedding,
  config,
  matchFunction,
  sourceTypes = null,
  sourceKeys = null,
  sourceOrigin,
  similarityThreshold,
}: MatchChunksInput): Promise<RetrievedContext[]> {
  const { data, error } = await supabase.rpc(matchFunction, {
    query_embedding: toEmbeddingLiteral(embedding),
    match_count: config.matchCount,
    similarity_threshold: similarityThreshold,
    source_types: sourceTypes,
    source_keys: sourceKeys,
    source_origins: [sourceOrigin],
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MatchRagChunkRow[]).map(row => ({
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: resolveUrl(row.url, config.siteUrl),
    path: row.path,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
    sourceMetadata: row.source_metadata ?? {},
    chunkMetadata: row.chunk_metadata ?? {},
    origin: sourceOrigin,
  }));
}
