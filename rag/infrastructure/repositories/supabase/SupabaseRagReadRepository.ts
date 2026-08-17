import type { SupabaseClient } from '@supabase/supabase-js';

import type { RetrievedContext } from '../../../domain/retrieval/RetrievedContext.js';
import type { EmbeddingIndex } from '../../../application/ports/EmbeddingIndex.js';
import type { RagSourceOrigin } from '../../../domain/content/RagSource.js';
import { toEmbeddingLiteral } from './vector.js';
import { resolveUrl } from '../../../application/common/url.js';
import type {
  FindChunksByTextInput,
  FindSourcesInput,
  MatchChunksInput,
  RagReadRepository,
  RagSourceRecord,
} from '../../../application/ports/RagReadRepository.js';
import type { DirectChunkRow, DirectSourceRow, MatchFunction, MatchRagChunkRow } from './rows.js';

const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';
const SOURCE_COLUMNS = 'id, source_type, source_key, title, url, path, origin, is_public, metadata';
const CHUNK_COLUMNS = 'id, source_id, chunk_index, content, metadata';

const MATCH_FUNCTION_BY_INDEX: Record<EmbeddingIndex, MatchFunction> = {
  primary: 'match_rag_chunks',
  fallback: 'match_rag_chunks_fallback',
};

export class SupabaseRagReadRepository implements RagReadRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly siteUrl: string
  ) {}

  async findSources({
    sourceTypes,
    sourceOrigin = FIRST_PARTY_ORIGIN,
  }: FindSourcesInput): Promise<RagSourceRecord[]> {
    const { data, error } = await this.supabase
      .from('rag_sources')
      .select(SOURCE_COLUMNS)
      .in('source_type', sourceTypes)
      .eq('origin', sourceOrigin)
      .eq('is_public', true);

    if (error) {
      throw error;
    }

    return ((data ?? []) as DirectSourceRow[]).map(row => toSourceRecord(row));
  }

  async findFirstChunksForSources(sources: RagSourceRecord[]): Promise<RetrievedContext[]> {
    if (sources.length === 0) {
      return [];
    }

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
      ((data ?? []) as DirectChunkRow[]).map(chunk => [chunk.source_id, chunk])
    );

    return sources.flatMap(source => {
      const chunk = chunksBySourceId.get(source.id);
      return chunk ? [this.createDirectContext(source, chunk)] : [];
    });
  }

  async matchChunks({
    embedding,
    index,
    matchCount,
    similarityThreshold,
    sourceOrigin,
    sourceTypes = null,
    sourceKeys = null,
  }: MatchChunksInput): Promise<RetrievedContext[]> {
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

    return ((data ?? []) as MatchRagChunkRow[]).map(row => ({
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
  }

  async findChunksByText({
    terms,
    matchCount,
    sourceOrigin = FIRST_PARTY_ORIGIN,
    sourceTypes = null,
  }: FindChunksByTextInput): Promise<RetrievedContext[]> {
    const searchableTerms = terms.map(normalizeTextSearchTerm).filter(Boolean);

    if (searchableTerms.length === 0) {
      return [];
    }

    const { data: chunkRows, error: chunkError } = await this.supabase
      .from('rag_chunks')
      .select(CHUNK_COLUMNS)
      .or(searchableTerms.map(term => `content.ilike.%${term}%`).join(','));

    if (chunkError) {
      throw chunkError;
    }

    const chunks = (chunkRows ?? []) as DirectChunkRow[];

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
      ((sourceRows ?? []) as DirectSourceRow[]).map(row => [row.id, toSourceRecord(row)])
    );

    return chunks
      .flatMap(chunk => {
        const source = sourcesById.get(chunk.source_id);
        return source ? [this.createDirectContext(source, chunk)] : [];
      })
      .slice(0, matchCount);
  }

  private createDirectContext(source: RagSourceRecord, chunk: DirectChunkRow): RetrievedContext {
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

function toSourceRecord(row: DirectSourceRow): RagSourceRecord {
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
