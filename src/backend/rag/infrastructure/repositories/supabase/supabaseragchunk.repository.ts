import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IRagChunkReadRepository,
  IRagChunkWriteRepository,
  RagChunkFallbackEmbeddingUpdate,
  RagChunkRecord,
  RagChunkUpsertRecord,
} from '../../../application/ports/iragchunk.repository.js';
import type { IDirectChunkRow } from './helpers/rows.js';
import { toEmbeddingLiteral } from './helpers/vector.js';

export class SupabaseRagChunkRepository implements IRagChunkReadRepository, IRagChunkWriteRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly logger?: ILogger) {}

  async replaceForSource(sourceId: string, chunks: RagChunkUpsertRecord[]): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase RAG chunks replace',
      { table: 'rag_chunks', sourceId, chunkCount: chunks.length },
      async () => {
        const { error: deleteError } = await this.supabase
          .from('rag_chunks')
          .delete()
          .eq('source_id', sourceId);

        if (deleteError) throw deleteError;
        if (chunks.length === 0) return;

        const { error: insertError } = await this.supabase.from('rag_chunks').insert(
          chunks.map(chunk => ({
            source_id: chunk.sourceId,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            embedding: chunk.embedding ? toEmbeddingLiteral(chunk.embedding) : null,
            fallback_embedding: chunk.fallbackEmbedding
              ? toEmbeddingLiteral(chunk.fallbackEmbedding)
              : null,
            metadata: chunk.metadata,
          }))
        );

        if (insertError) throw insertError;
      }
    );
  }

  async findBySourceId(sourceId: string): Promise<RagChunkRecord[]> {
    return logOperation(
      this.logger,
      'Supabase RAG chunks query',
      { table: 'rag_chunks', sourceId },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_chunks')
          .select('id, source_id, chunk_index, content, metadata')
          .eq('source_id', sourceId)
          .order('chunk_index');

        if (error) throw error;

        return ((data ?? []) as IDirectChunkRow[]).map(toChunkRecord);
      },
      records => ({ chunkCount: records.length })
    );
  }

  async findFirstBySourceIds(sourceIds: string[]): Promise<RagChunkRecord[]> {
    if (sourceIds.length === 0) return [];

    return logOperation(
      this.logger,
      'Supabase RAG first chunks query',
      { table: 'rag_chunks', sourceCount: sourceIds.length },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_chunks')
          .select('id, source_id, chunk_index, content, metadata')
          .in('source_id', sourceIds)
          .eq('chunk_index', 0);

        if (error) throw error;

        return ((data ?? []) as IDirectChunkRow[]).map(toChunkRecord);
      },
      records => ({ chunkCount: records.length })
    );
  }

  async count(): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase RAG chunks count',
      { table: 'rag_chunks' },
      async () => {
        const { count, error } = await this.supabase
          .from('rag_chunks')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return count ?? 0;
      }
    );
  }

  async listPage(offset: number, pageSize: number): Promise<RagChunkRecord[]> {
    return logOperation(
      this.logger,
      'Supabase RAG chunks page query',
      { table: 'rag_chunks', offset, pageSize },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_chunks')
          .select('id, source_id, chunk_index, content, metadata')
          .order('id')
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return ((data ?? []) as IDirectChunkRow[]).map(toChunkRecord);
      },
      records => ({ chunkCount: records.length })
    );
  }

  async clearFallbackEmbeddings(): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase RAG fallback embeddings clear',
      { table: 'rag_chunks' },
      async () => {
        const { error } = await this.supabase
          .from('rag_chunks')
          .update({ fallback_embedding: null })
          .not('id', 'is', null);

        if (error) throw error;
      }
    );
  }

  async updateFallbackEmbeddings(updates: RagChunkFallbackEmbeddingUpdate[]): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase RAG fallback embeddings update',
      { table: 'rag_chunks', chunkCount: updates.length },
      async () => {
        const results = await Promise.all(
          updates.map(update =>
            this.supabase
              .from('rag_chunks')
              .update({ fallback_embedding: toEmbeddingLiteral(update.embedding) })
              .eq('id', update.id)
          )
        );
        const error = results.find((result: { error: Error | null }) => result.error)?.error;

        if (error) throw error;
      }
    );
  }
}

function toChunkRecord(row: IDirectChunkRow): RagChunkRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    metadata: row.metadata,
  };
}
