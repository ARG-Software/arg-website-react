import type { SupabaseClient } from '@supabase/supabase-js';
import type { IEmbeddingProvider } from '../ports/IProviderPorts.js';
import { toEmbeddingLiteral } from '../../infrastructure/repositories/supabase/vector.js';

const PAGE_SIZE = 100;

interface IRagChunkRow {
  id: string;
  content: string;
}

export interface IRebuildFallbackEmbeddingsProgress {
  chunkCount: number;
  rebuiltCount: number;
}

export interface IRebuildFallbackEmbeddingsOptions {
  onCleared?: (chunkCount: number) => void;
  onProgress?: (progress: IRebuildFallbackEmbeddingsProgress) => void;
}

interface IRebuildFallbackEmbeddingsDependencies {
  supabase: SupabaseClient;
  fallbackEmbeddingProvider: IEmbeddingProvider;
}

export async function rebuildFallbackEmbeddings(
  dependencies: IRebuildFallbackEmbeddingsDependencies,
  options: IRebuildFallbackEmbeddingsOptions = {}
): Promise<IRebuildFallbackEmbeddingsProgress> {
  const chunkCount = await getChunkCount(dependencies.supabase);

  if (chunkCount === 0) {
    return { chunkCount, rebuiltCount: 0 };
  }

  options.onCleared?.(chunkCount);
  const { error: clearError } = await dependencies.supabase
    .from('rag_chunks')
    .update({ fallback_embedding: null })
    .not('id', 'is', null);

  if (clearError) {
    throw clearError;
  }

  let offset = 0;
  let rebuiltCount = 0;

  while (offset < chunkCount) {
    const chunks = await loadChunkPage(dependencies.supabase, offset);

    if (chunks.length === 0) {
      break;
    }

    const embeddings = await dependencies.fallbackEmbeddingProvider.embedTexts(
      chunks.map(chunk => chunk.content)
    );

    const updates = await Promise.all(
      chunks.map((chunk, index) =>
        dependencies.supabase
          .from('rag_chunks')
          .update({ fallback_embedding: toEmbeddingLiteral(embeddings[index]) })
          .eq('id', chunk.id)
      )
    );
    const updateError = updates.find((result: { error: Error | null }) => result.error)?.error;

    if (updateError) {
      throw updateError;
    }

    rebuiltCount += chunks.length;
    offset += chunks.length;
    options.onProgress?.({ chunkCount, rebuiltCount });
  }

  if (rebuiltCount !== chunkCount) {
    throw new Error(`Expected to rebuild ${chunkCount} chunks, rebuilt ${rebuiltCount}`);
  }

  return { chunkCount, rebuiltCount };
}

async function getChunkCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('rag_chunks')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function loadChunkPage(supabase: SupabaseClient, offset: number): Promise<IRagChunkRow[]> {
  const { data, error } = await supabase
    .from('rag_chunks')
    .select('id, content')
    .order('id')
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  return (data ?? []) as IRagChunkRow[];
}
