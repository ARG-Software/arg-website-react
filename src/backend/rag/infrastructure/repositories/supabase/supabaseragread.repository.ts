import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IRetrievedContext } from '../../../domain/retrieval/iretrievedcontext.js';
import type { EmbeddingIndex } from '../../../application/ports/embeddingindex.js';
import type { RagSourceOrigin } from '../../../domain/content/iragsource.js';
import { resolveUrl } from '../../../application/common/url.js';
import type {
  IFindChunksByTextInput,
  IFindSourcesInput,
  IMatchChunksInput,
  IRagReadRepository,
  IRagSourceRecord,
} from '../../../application/ports/iragread.repository.js';
import type { IDirectChunkRow, IDirectSourceRow, MatchFunction, IMatchRagChunkRow } from './rows.js';
import { toEmbeddingLiteral } from './vector.js';

const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';
const SOURCE_COLUMNS = 'id, source_type, source_key, title, url, path, origin, is_public, metadata';
const CHUNK_COLUMNS = 'id, source_id, chunk_index, content, metadata';

const MATCH_FUNCTION_BY_INDEX: Record<EmbeddingIndex, MatchFunction> = {
  primary: 'match_rag_chunks',
  fallback: 'match_rag_chunks_fallback',
};

export class SupabaseRagReadRepository implements IRagReadRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly siteUrl: string,
    private readonly logger?: ILogger
  ) {}

  async findSources({
    sourceTypes,
    sourceOrigin = FIRST_PARTY_ORIGIN,
  }: IFindSourcesInput): Promise<IRagSourceRecord[]> {
    return logOperation(
      this.logger,
      'Supabase RAG sources query',
      { table: 'rag_sources', sourceTypes, sourceOrigin },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_sources')
          .select(SOURCE_COLUMNS)
          .in('source_type', sourceTypes)
          .eq('origin', sourceOrigin)
          .eq('is_public', true);

        if (error) {
          throw error;
        }

        return ((data ?? []) as IDirectSourceRow[]).map(row => toSourceRecord(row));
      },
      result => ({ sourceCount: result.length })
    );
  }

  async findFirstChunksForSources(sources: IRagSourceRecord[]): Promise<IRetrievedContext[]> {
    if (sources.length === 0) {
      this.logger?.info('Supabase RAG first chunks query skipped', { reason: 'empty_sources' });
      return [];
    }

    return logOperation(
      this.logger,
      'Supabase RAG first chunks query',
      { table: 'rag_chunks', sourceCount: sources.length },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_chunks')
          .select(CHUNK_COLUMNS)
          .in(
            'source_id',
            sources.map(source => source.id)
          )
          .eq('chunk_index', 0);

        if (error) {
          throw error;
        }

        const chunksBySourceId = new Map(
          ((data ?? []) as IDirectChunkRow[]).map(chunk => [chunk.source_id, chunk])
        );

        return sources.flatMap(source => {
          const chunk = chunksBySourceId.get(source.id);
          return chunk ? [this.createDirectContext(source, chunk)] : [];
        });
      },
      result => ({ contextCount: result.length })
    );
  }

  async matchChunks({
    embedding,
    index,
    matchCount,
    similarityThreshold,
    sourceOrigin,
    sourceTypes = null,
    sourceKeys = null,
  }: IMatchChunksInput): Promise<IRetrievedContext[]> {
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

        if (error) {
          throw error;
        }

        return ((data ?? []) as IMatchRagChunkRow[]).map(row => ({
          chunkId: row.chunk_id,
          sourceId: row.source_id,
          sourceType: row.source_type,
          sourceKey: row.source_key,
          title: row.title,
          url: resolveUrl(row.url, this.siteUrl),
          path: row.path,
          chunkIndex: row.chunk_index,
          content: row.content,
          similarity: row.similarity,
          sourceMetadata: row.source_metadata ?? {},
          chunkMetadata: row.chunk_metadata ?? {},
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
  }: IFindChunksByTextInput): Promise<IRetrievedContext[]> {
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

        if (chunkError) {
          throw chunkError;
        }

        const chunks = (chunkRows ?? []) as IDirectChunkRow[];

        if (chunks.length === 0) {
          return [];
        }

        const sourceIds = [...new Set(chunks.map(chunk => chunk.source_id))];
        let sourcesQuery = this.supabase
          .from('rag_sources')
          .select(SOURCE_COLUMNS)
          .in('id', sourceIds)
          .eq('origin', sourceOrigin)
          .eq('is_public', true);

        if (sourceTypes) {
          sourcesQuery = sourcesQuery.in('source_type', sourceTypes);
        }

        const { data: sourceRows, error: sourceError } = await sourcesQuery;

        if (sourceError) {
          throw sourceError;
        }

        const sourcesById = new Map(
          ((sourceRows ?? []) as IDirectSourceRow[]).map(row => [row.id, toSourceRecord(row)])
        );

        return chunks
          .flatMap(chunk => {
            const source = sourcesById.get(chunk.source_id);
            return source ? [this.createDirectContext(source, chunk)] : [];
          })
          .slice(0, matchCount);
      },
      result => ({ contextCount: result.length })
    );
  }

  private createDirectContext(source: IRagSourceRecord, chunk: IDirectChunkRow): IRetrievedContext {
    return {
      chunkId: chunk.id,
      sourceId: source.id,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      url: resolveUrl(source.url, this.siteUrl),
      path: source.path,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      similarity: 1,
      sourceMetadata: source.metadata ?? {},
      chunkMetadata: chunk.metadata ?? {},
      origin: source.origin,
    };
  }
}

function toSourceRecord(row: IDirectSourceRow): IRagSourceRecord {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: row.url,
    path: row.path,
    origin: row.origin,
    isPublic: row.is_public,
    metadata: row.metadata,
  };
}

function normalizeTextSearchTerm(term: string): string {
  return term.replace(/[%_,]/gu, ' ').replace(/\s+/gu, ' ').trim();
}

