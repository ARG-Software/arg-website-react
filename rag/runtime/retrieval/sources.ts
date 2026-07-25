import type { SupabaseClient } from '@supabase/supabase-js';

import type { RetrievedContext } from '../../types/ai.js';
import type { RagConfig } from '../../types/config.js';
import type { RagSourceOrigin, RagSourceType } from '../../types/source.js';
import { resolveUrl } from '../url.js';
import type { DirectChunkRow, DirectSourceRow } from './types.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export async function retrieveSources(
  supabase: SupabaseClient,
  sourceTypes: RagSourceType[],
  sourceOrigin: RagSourceOrigin = FIRST_PARTY_ORIGIN
): Promise<DirectSourceRow[]> {
  const { data, error } = await supabase
    .from('rag_sources')
    .select('id, source_type, source_key, title, url, path, origin, is_public, metadata')
    .in('source_type', sourceTypes)
    .eq('origin', sourceOrigin)
    .eq('is_public', true);

  if (error) {
    throw error;
  }

  return (data ?? []) as DirectSourceRow[];
}

export async function retrieveFirstChunksForSources(
  supabase: SupabaseClient,
  config: RagConfig,
  sources: DirectSourceRow[]
): Promise<RetrievedContext[]> {
  if (sources.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('rag_chunks')
    .select('id, source_id, chunk_index, content, metadata')
    .in(
      'source_id',
      sources.map(source => source.id)
    )
    .eq('chunk_index', 0);

  if (error) {
    throw error;
  }

  const chunksBySourceId = new Map(
    ((data ?? []) as DirectChunkRow[]).map(chunk => [chunk.source_id, chunk])
  );

  return sources.flatMap(source => {
    const chunk = chunksBySourceId.get(source.id);

    if (!chunk) {
      return [];
    }

    return [createDirectContext(source, chunk, config)];
  });
}

export function createDirectContext(
  source: DirectSourceRow,
  chunk: DirectChunkRow,
  config: RagConfig
): RetrievedContext {
  return {
    chunkId: chunk.id,
    sourceId: source.id,
    sourceType: source.source_type,
    sourceKey: source.source_key,
    title: source.title,
    url: resolveUrl(source.url, config.siteUrl),
    path: source.path,
    chunkIndex: chunk.chunk_index,
    content: chunk.content,
    similarity: 1,
    sourceMetadata: source.metadata ?? {},
    chunkMetadata: chunk.metadata ?? {},
    origin: source.origin,
  };
}
