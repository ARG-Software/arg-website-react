import type { SupabaseClient } from '@supabase/supabase-js';

import type { RagSourceRepository } from '../types/ingestion.js';
import type { RagSource } from '../types/source.js';
import { toEmbeddingLiteral } from '../utils/embeddings.js';
import { chunkText } from '../ingestion/processing/chunking.js';
import { createContentHash, normalizeText } from '../ingestion/processing/text.js';

export class SupabaseRagSourceRepository implements RagSourceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertSource(
    source: RagSource,
    embeddings: number[][]
  ): Promise<{ sourceId: string | null; chunkCount: number }> {
    const content = normalizeText(source.content);
    const chunks = source.chunks ?? chunkText(content);

    if (chunks.length === 0) {
      return { sourceId: null, chunkCount: 0 };
    }

    if (embeddings.length !== chunks.length) {
      throw new Error(`Expected ${chunks.length} embeddings, received ${embeddings.length}`);
    }

    const { data: sourceRow, error: sourceError } = await this.supabase
      .from('rag_sources')
      .upsert(
        {
          source_type: source.sourceType,
          source_key: source.sourceKey,
          title: source.title,
          url: source.url ?? null,
          path: source.path ?? null,
          origin: source.origin,
          is_public: source.isPublic,
          metadata: source.metadata ?? {},
          content_hash: createContentHash(content),
        },
        { onConflict: 'source_type,source_key' }
      )
      .select('id')
      .single();

    if (sourceError) {
      throw sourceError;
    }

    const sourceId = sourceRow.id;

    const { error: deleteError } = await this.supabase
      .from('rag_chunks')
      .delete()
      .eq('source_id', sourceId);

    if (deleteError) {
      throw deleteError;
    }

    const rows = chunks.map((chunk, index) => ({
      source_id: sourceId,
      chunk_index: index,
      content: chunk,
      embedding: toEmbeddingLiteral(embeddings[index]),
      metadata: {
        ...(source.chunkMetadata ?? {}),
        char_count: chunk.length,
      },
    }));

    const { error: chunkError } = await this.supabase.from('rag_chunks').insert(rows);

    if (chunkError) {
      throw chunkError;
    }

    return { sourceId, chunkCount: rows.length };
  }

  async getSourceContentHash(
    source: Pick<RagSource, 'sourceType' | 'sourceKey'>
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('rag_sources')
      .select('content_hash')
      .eq('source_type', source.sourceType)
      .eq('source_key', source.sourceKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return typeof data?.content_hash === 'string' ? data.content_hash : null;
  }
}
