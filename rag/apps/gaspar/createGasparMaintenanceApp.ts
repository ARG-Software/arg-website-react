import { geminiFallbackEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { toEmbeddingLiteral } from '../../infrastructure/repositories/supabase/vector.js';

const PAGE_SIZE = 100;

interface RagChunkRow {
  id: string;
  content: string;
}

export interface RebuildFallbackEmbeddingsProgress {
  chunkCount: number;
  rebuiltCount: number;
}

export interface RebuildFallbackEmbeddingsOptions {
  onCleared?: (chunkCount: number) => void;
  onProgress?: (progress: RebuildFallbackEmbeddingsProgress) => void;
}

export function createGasparMaintenanceApp() {
  const supabase = createSupabaseServiceClient();

  return {
    keepDatabaseAlive,
    rebuildFallbackEmbeddings,
  };

  async function keepDatabaseAlive() {
    const { error } = await supabase.from('rag_sources').select('id').limit(1);

    if (error) {
      throw error;
    }
  }

  async function rebuildFallbackEmbeddings(
    options: RebuildFallbackEmbeddingsOptions = {}
  ): Promise<RebuildFallbackEmbeddingsProgress> {
    const chunkCount = await getChunkCount();

    if (chunkCount === 0) {
      return { chunkCount, rebuiltCount: 0 };
    }

    options.onCleared?.(chunkCount);
    const { error: clearError } = await supabase
      .from('rag_chunks')
      .update({ fallback_embedding: null })
      .not('id', 'is', null);

    if (clearError) {
      throw clearError;
    }

    let offset = 0;
    let rebuiltCount = 0;

    while (offset < chunkCount) {
      const chunks = await loadChunkPage(offset);

      if (chunks.length === 0) {
        break;
      }

      const embeddings = await geminiFallbackEmbeddingClient.embedTexts(
        chunks.map(chunk => chunk.content)
      );

      const updates = await Promise.all(
        chunks.map((chunk, index) =>
          supabase
            .from('rag_chunks')
            .update({ fallback_embedding: toEmbeddingLiteral(embeddings[index]) })
            .eq('id', chunk.id)
        )
      );
      const updateError = updates.find(result => result.error)?.error;

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

  async function getChunkCount(): Promise<number> {
    const { count, error } = await supabase
      .from('rag_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async function loadChunkPage(offset: number): Promise<RagChunkRow[]> {
    const { data, error } = await supabase
      .from('rag_chunks')
      .select('id, content')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    return (data ?? []) as RagChunkRow[];
  }
}
