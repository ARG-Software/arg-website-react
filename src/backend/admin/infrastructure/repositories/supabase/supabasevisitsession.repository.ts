import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/supabase/supabaserepositorybase.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IVisitSessionRepository,
  VisitJourneySessionRecord,
  VisitMetricSessionRecord,
  VisitSessionFindManyQuery,
  VisitSessionFindManyResult,
} from '../../../application/ports/repositories/ivisitsession.repository.js';
import type {
  VisitSessionListItem,
  VisitSessionSortField,
} from '../../../domain/types/visitsession.types.js';

type VisitSessionRow = {
  session_hash: string;
  country_code: string | null;
  region: string;
  city: string;
  timezone: string;
  entry_path: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  click_id: string | null;
  page_count: number;
  event_count: number;
  duration_ms: number;
  started_at: string;
  last_seen_at: string;
};

type VisitMetricSessionRow = {
  session_hash: string;
  country_code: string | null;
  referrer: string | null;
  source: string | null;
  campaign: string | null;
  click_id: string | null;
};

type VisitJourneySessionRow = {
  session_hash: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

export class SupabaseVisitSessionRepository
  extends SupabaseRepositoryBase
  implements IVisitSessionRepository
{
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {
    super();
  }

  async findMany({
    page = 1,
    pageSize = 10,
    sortBy = 'lastSeenAt',
    sortDirection = 'desc',
    recentSince = null,
  }: VisitSessionFindManyQuery = {}): Promise<VisitSessionFindManyResult> {
    return logOperation(
      this.logger,
      'Supabase visit sessions query',
      { table: 'visit_sessions', recentSince, page, pageSize, sortBy, sortDirection },
      async () => {
        const { from, to } = this.getPageRange(page, pageSize);
        const sortColumn = getVisitSessionSortColumn(sortBy);
        let query = this.client
          .from('visit_sessions')
          .select(
            'session_hash, country_code, region, city, timezone, entry_path, referrer, source, medium, campaign, term, content, click_id, page_count, event_count, duration_ms, started_at, last_seen_at',
            { count: 'exact' }
          );

        if (recentSince) query = query.gte('last_seen_at', recentSince);

        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
        if (sortColumn !== 'last_seen_at') query = query.order('last_seen_at', { ascending: false });

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;

        return {
          records: ((data || []) as VisitSessionRow[]).map(toSessionRecord),
          totalRecords: count || 0,
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.totalRecords })
    );
  }

  async findMetricsByHashes(sessionHashes: string[]): Promise<VisitMetricSessionRecord[]> {
    if (!sessionHashes.length) return [];

    return logOperation(
      this.logger,
      'Supabase visit metric sessions query',
      { table: 'visit_sessions', sessionCount: sessionHashes.length },
      async () => {
        const rows: VisitMetricSessionRow[] = [];
        const pageSize = 100;

        for (let index = 0; index < sessionHashes.length; index += pageSize) {
          const { data, error } = await this.client
            .from('visit_sessions')
            .select('session_hash, country_code, referrer, source, campaign, click_id')
            .in('session_hash', sessionHashes.slice(index, index + pageSize));

          if (error) throw error;
          rows.push(...((data || []) as VisitMetricSessionRow[]));
        }

        return rows.map(toMetricSessionRecord);
      },
      records => ({ recordCount: records.length })
    );
  }

  async findJourneyByHash(sessionHash: string): Promise<VisitJourneySessionRecord> {
    return logOperation(
      this.logger,
      'Supabase visit journey session query',
      { table: 'visit_sessions', sessionHash },
      async () => {
        const { data, error } = await this.client
          .from('visit_sessions')
          .select('session_hash, referrer, source, medium, campaign')
          .eq('session_hash', sessionHash)
          .single();

        if (error) throw error;

        return toJourneySessionRecord(data as VisitJourneySessionRow);
      }
    );
  }

  async deleteById(sessionHash: string): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase visit session delete',
      { table: 'visit_sessions', sessionHash },
      async () => {
        const { error } = await this.client
          .from('visit_sessions')
          .delete()
          .eq('session_hash', sessionHash);

        if (error) throw error;
      }
    );
  }

  async deleteOlderThan(cutoffIso: string): Promise<{ events: number; sessions: number }> {
    return logOperation(
      this.logger,
      'Supabase old visit sessions delete',
      { table: 'visit_sessions', cutoffIso },
      async () => {
        const { count: sessionCount, error: sessionError } = await this.client
          .from('visit_sessions')
          .delete({ count: 'exact' })
          .lt('last_seen_at', cutoffIso);

        if (sessionError) throw sessionError;

        return {
          events: 0,
          sessions: sessionCount || 0,
        };
      },
      result => ({ deletedSessions: result.sessions })
    );
  }
}

function getVisitSessionSortColumn(sortBy: VisitSessionSortField): string {
  if (sortBy === 'entryPath') return 'entry_path';
  if (sortBy === 'pageCount') return 'page_count';
  if (sortBy === 'eventCount') return 'event_count';
  if (sortBy === 'durationMs') return 'duration_ms';

  return 'last_seen_at';
}

function toSessionRecord(row: VisitSessionRow): VisitSessionListItem {
  return {
    id: row.session_hash,
    sessionHash: row.session_hash,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    timezone: row.timezone,
    entryPath: row.entry_path,
    referrer: row.referrer,
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    term: row.term,
    content: row.content,
    clickId: row.click_id,
    pageCount: row.page_count,
    eventCount: row.event_count,
    durationMs: row.duration_ms,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
  };
}

function toMetricSessionRecord(row: VisitMetricSessionRow): VisitMetricSessionRecord {
  return {
    sessionHash: row.session_hash,
    countryCode: row.country_code,
    referrer: row.referrer,
    source: row.source,
    campaign: row.campaign,
    clickId: row.click_id,
  };
}

function toJourneySessionRecord(row: VisitJourneySessionRow): VisitJourneySessionRecord {
  return {
    sessionHash: row.session_hash,
    referrer: row.referrer,
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
  };
}
