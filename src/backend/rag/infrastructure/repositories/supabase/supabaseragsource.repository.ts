import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IFindRagSourcesInput,
  IRagSourceReadRepository,
  IRagSourceWriteRepository,
  RagSourceIdentity,
  RagSourceRecord,
  RagSourceUpsertRecord,
} from '../../../application/ports/iragsource.repository.js';
import type { IDirectSourceRow } from './helpers/rows.js';

type RagSourceRow = IDirectSourceRow & {
  content_hash: string | null;
};

const FIRST_PARTY_ORIGIN = 'first_party';
const SOURCE_COLUMNS = 'id, source_type, source_key, title, url, path, origin, is_public, metadata, content_hash';

export class SupabaseRagSourceRepository implements IRagSourceReadRepository, IRagSourceWriteRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly logger?: ILogger) {}

  async findByKey(source: RagSourceIdentity): Promise<RagSourceRecord | null> {
    return logOperation(
      this.logger,
      'Supabase RAG source query',
      { table: 'rag_sources', sourceType: source.sourceType, sourceKey: source.sourceKey },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_sources')
          .select(SOURCE_COLUMNS)
          .eq('source_type', source.sourceType)
          .eq('source_key', source.sourceKey)
          .maybeSingle();

        if (error) throw error;

        return data ? toSourceRecord(data as RagSourceRow) : null;
      },
      result => ({ found: Boolean(result) })
    );
  }

  async findPublicByTypes({
    sourceTypes,
    sourceOrigin = FIRST_PARTY_ORIGIN,
  }: IFindRagSourcesInput): Promise<RagSourceRecord[]> {
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

        if (error) throw error;

        return ((data ?? []) as RagSourceRow[]).map(toSourceRecord);
      },
      result => ({ sourceCount: result.length })
    );
  }

  async upsert(source: RagSourceUpsertRecord): Promise<string> {
    return logOperation(
      this.logger,
      'Supabase RAG source upsert',
      {
        table: 'rag_sources',
        sourceType: source.sourceType,
        sourceKey: source.sourceKey,
        origin: source.origin,
      },
      async () => {
        const { data, error } = await this.supabase
          .from('rag_sources')
          .upsert(
            {
              source_type: source.sourceType,
              source_key: source.sourceKey,
              title: source.title,
              url: source.url,
              path: source.path,
              origin: source.origin,
              is_public: source.isPublic,
              metadata: source.metadata,
              content_hash: source.contentHash,
            },
            { onConflict: 'source_type,source_key' }
          )
          .select('id')
          .single();

        if (error) throw error;

        return data.id;
      },
      sourceId => ({ sourceId })
    );
  }
}

function toSourceRecord(row: RagSourceRow): RagSourceRecord {
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
    contentHash: row.content_hash,
  };
}
