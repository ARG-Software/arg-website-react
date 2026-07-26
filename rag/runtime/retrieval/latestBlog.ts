import type { SupabaseClient } from '@supabase/supabase-js';

import type { RagConfig } from '../../core/types/config.js';
import type { RetrievedContext } from '../../core/types/context.js';
import { retrieveFirstChunksForSources } from './sources.js';
import type { DirectSourceRow } from './types.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export async function retrieveLatestBlogContexts(
  supabase: SupabaseClient,
  config: RagConfig
): Promise<RetrievedContext[]> {
  const { data, error } = await supabase
    .from('rag_sources')
    .select('id, source_type, source_key, title, url, path, origin, is_public, metadata')
    .eq('source_type', 'blog_post')
    .eq('origin', FIRST_PARTY_ORIGIN)
    .eq('is_public', true);

  if (error) {
    throw error;
  }

  const newestSources = ((data ?? []) as DirectSourceRow[])
    .map(source => ({ source, timestamp: getPublicationTimestamp(source.metadata) }))
    .filter((item): item is { source: DirectSourceRow; timestamp: number } => item.timestamp !== null)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 3)
    .map(item => item.source);

  return retrieveFirstChunksForSources(supabase, config, newestSources);
}

function getPublicationTimestamp(metadata: DirectSourceRow['metadata']): number | null {
  const date = metadata?.date;
  const timestamp = typeof date === 'string' ? Date.parse(date) : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}
