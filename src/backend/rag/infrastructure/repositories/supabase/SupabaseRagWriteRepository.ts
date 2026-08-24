import type { SupabaseClient } from '@supabase/supabase-js';

import type { IRagSourceEmbeddings, IUpsertSourceResult } from '../../../application/ingestion/IIngestionTypes.js';
import type { IRagSource } from '../../../domain/content/IRagSource.js';
import { toEmbeddingLiteral } from './vector.js';
import type { IChunkingConfig } from '../../../application/ragConfig.js';
import { chunkText } from '../../../application/ingestion/processing/chunking.js';
import { createSourceHash, normalizeText } from '../../../application/ingestion/processing/text.js';
import type { IRagWriteRepository } from '../../../application/ports/IRagWriteRepository.js';

export class SupabaseRagWriteRepository implements IRagWriteRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly chunkingConfig: IChunkingConfig
  ) {}

  async upsertSource(
    source: IRagSource,
    embeddings: IRagSourceEmbeddings
  ): Promise<IUpsertSourceResult> {
    const content = normalizeText(source.content);
    const chunks = source.chunks ?? chunkText(content, this.chunkingConfig);

    if (chunks.length === 0) {
      return { sourceId: null, chunkCount: 0 };
    }

    if (embeddings.primary) {
      assertEmbeddingCount('primary', chunks, embeddings.primary);
    }
    if (embeddings.fallback) {
      assertEmbeddingCount('fallback', chunks, embeddings.fallback);
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
          content_hash: createSourceHash(source),
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
      embedding: embeddings.primary ? toEmbeddingLiteral(embeddings.primary[index]) : null,
      fallback_embedding: embeddings.fallback
        ? toEmbeddingLiteral(embeddings.fallback[index])
        : null,
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

  async updateFallbackEmbeddings(source: IRagSource, embeddings: number[][]): Promise<IUpsertSourceResult> {
    const content = normalizeText(source.content);
    const chunks = source.chunks ?? chunkText(content, this.chunkingConfig);

    if (chunks.length === 0) {
      return { sourceId: null, chunkCount: 0 };
    }

    assertEmbeddingCount('fallback', chunks, embeddings);

    const { data: sourceRow, error: sourceError } = await this.supabase
      .from('rag_sources')
      .select('id, content_hash')
      .eq('source_type', source.sourceType)
      .eq('source_key', source.sourceKey)
      .maybeSingle();

    if (sourceError) {
      throw sourceError;
    }

    if (!sourceRow) {
      return this.upsertSource(source, { primary: null, fallback: embeddings });
    }

    const { data: chunkRows, error: chunkError } = await this.supabase
      .from('rag_chunks')
      .select('id, chunk_index, content')
      .eq('source_id', sourceRow.id)
      .order('chunk_index');

    if (chunkError) {
      throw chunkError;
    }

    if (
      chunkRows.length !== chunks.length ||
      chunkRows.some(
        (row: { chunk_index: number; content: string }, index: number) =>
          row.chunk_index !== index || row.content !== chunks[index]
      )
    ) {
      return this.upsertSource(source, { primary: null, fallback: embeddings });
    }

    const updates = await Promise.all(
      chunkRows.map((row: { id: string }, index: number) =>
        this.supabase
          .from('rag_chunks')
          .update({ fallback_embedding: toEmbeddingLiteral(embeddings[index]) })
          .eq('id', row.id)
      )
    );
    const updateError = updates.find((result: { error: Error | null }) => result.error)?.error;

    if (updateError) {
      throw updateError;
    }

    return { sourceId: sourceRow.id, chunkCount: chunks.length };
  }

  async getSourceContentHash(
    source: Pick<IRagSource, 'sourceType' | 'sourceKey'>
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

function assertEmbeddingCount(label: string, chunks: string[], embeddings: number[][]): void {
  if (embeddings.length !== chunks.length) {
    throw new Error(`Expected ${chunks.length} ${label} embeddings, received ${embeddings.length}`);
  }
}
