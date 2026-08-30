import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { EmbeddingIndex, RagSourceOrigin } from '../../../domain/sources/ragsource.types.js';
import type {
  IFindChunksByTextInput,
  IMatchChunksInput,
  IRagChunkSearchRepository,
  RagMatchedChunkRecord,
} from '../../../application/ports/iragchunksearch.repository.js';
import type { IDirectChunkRow, IDirectSourceRow, IMatchRagChunkRow, MatchFunction } from './helpers/rows.js';
import { toEmbeddingLiteral } from './helpers/vector.js';

const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';
const SOURCE_COLUMNS = 'id, source_type, source_key, title, url, path, origin, is_public, metadata';
const CHUNK_COLUMNS = 'id, source_id, chunk_index, content, metadata';

const MATCH_FUNCTION_BY_INDEX: Record<EmbeddingIndex, MatchFunction> = {
  primary: 'match_rag_chunks',
  fallback: 'match_rag_chunks_fallback',
};

export class SupabaseRagChunkSearchRepository implements IRagChunkSearchRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly logger?: ILogger) {}

  async matchChunks({
    embedding,
    index,
    matchCount,
    similarityThreshold,
    sourceOrigin,
    sourceTypes = null,
    sourceKeys = null,
  }: IMatchChunksInput): Promise<RagMatchedChunkRecord[]> {
    return logOperation(
      this.logger,
      'Supabase RAG vector match query',
      {
        operation: MATCH_FUNCTION_BY_INDEX[index],
        index,
        matchCount,
        similarityThreshold,
        sourceOrigin,
        sourceTypes,
        sourceKeyCount: sourceKeys?.length ?? 0,
      },
      async () => {
        const { data, error } = await this.supabase.rpc(MATCH_FUNCTION_BY_INDEX[index], {
          query_embedding: toEmbeddingLiteral(embedding),
          match_count: matchCount,
          similarity_threshold: similarityThreshold,
          source_types: sourceTypes,
          source_keys: sourceKeys,
          source_origins: [sourceOrigin],
        });

        if (error) throw error;

        return ((data ?? []) as IMatchRagChunkRow[]).map(row => ({
          chunkId: row.chunk_id,
          sourceId: row.source_id,
          sourceType: row.source_type,
          sourceKey: row.source_key,
          title: row.title,
          url: row.url,
          path: row.path,
          chunkIndex: row.chunk_index,
          content: row.content,
          similarity: row.similarity,
          sourceMetadata: row.source_metadata,
          chunkMetadata: row.chunk_metadata,
          origin: sourceOrigin,
        }));
      },
      result => ({ contextCount: result.length })
    );
  }

  async findChunksByText({
    terms,
    matchCount,
    sourceOrigin = FIRST_PARTY_ORIGIN,
    sourceTypes = null,
  }: IFindChunksByTextInput): Promise<RagMatchedChunkRecord[]> {
    const searchableTerms = terms.map(normalizeTextSearchTerm).filter(Boolean);

    if (searchableTerms.length === 0) {
      this.logger?.info('Supabase RAG text chunks query skipped', { reason: 'empty_terms' });
      return [];
    }

    return logOperation(
      this.logger,
      'Supabase RAG text chunks query',
      {
        tables: ['rag_chunks', 'rag_sources'],
        termCount: searchableTerms.length,
        matchCount,
        sourceOrigin,
        sourceTypes,
      },
      async () => {
        const { data: chunkRows, error: chunkError } = await this.supabase
          .from('rag_chunks')
          .select(CHUNK_COLUMNS)
          .or(searchableTerms.map(term => `content.ilike.%${term}%`).join(','));

        if (chunkError) throw chunkError;

        const chunks = (chunkRows ?? []) as IDirectChunkRow[];
        if (chunks.length === 0) return [];

        const sourceIds = [...new Set(chunks.map(chunk => chunk.source_id))];
        let sourcesQuery = this.supabase
          .from('rag_sources')
          .select(SOURCE_COLUMNS)
          .in('id', sourceIds)
          .eq('origin', sourceOrigin)
          .eq('is_public', true);

        if (sourceTypes) sourcesQuery = sourcesQuery.in('source_type', sourceTypes);

        const { data: sourceRows, error: sourceError } = await sourcesQuery;

        if (sourceError) throw sourceError;

        const sourcesById = new Map(((sourceRows ?? []) as IDirectSourceRow[]).map(row => [row.id, row]));

        return chunks
          .flatMap(chunk => {
            const source = sourcesById.get(chunk.source_id);
            return source ? [toMatchedChunkRecord(source, chunk, sourceOrigin)] : [];
          })
          .slice(0, matchCount);
      },
      result => ({ contextCount: result.length })
    );
  }
}

function toMatchedChunkRecord(
  source: IDirectSourceRow,
  chunk: IDirectChunkRow,
  origin: RagSourceOrigin
): RagMatchedChunkRecord {
  return {
    chunkId: chunk.id,
    sourceId: source.id,
    sourceType: source.source_type,
    sourceKey: source.source_key,
    title: source.title,
    url: source.url,
    path: source.path,
    chunkIndex: chunk.chunk_index,
    content: chunk.content,
    similarity: 1,
    sourceMetadata: source.metadata,
    chunkMetadata: chunk.metadata,
    origin,
  };
}

function normalizeTextSearchTerm(term: string): string {
  return term.replace(/[%_,]/gu, ' ').replace(/\s+/gu, ' ').trim();
}
