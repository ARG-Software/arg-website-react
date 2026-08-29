import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IVisitRepository } from '../../../application/ports/repositories/ivisit.repository.js';
import type {
  VisitBreakdownQuery,
  VisitBreakdownMetric,
  VisitBreakdownResult,
  VisitChartResult,
  VisitChartSeries,
  VisitMetricRange,
  VisitStatMetric,
  VisitStatResult,
} from '../../../domain/types/visitmetrics.types.js';
import type { VisitJourneyEvent } from '../../../domain/types/visitevents.types.js';
import type {
  VisitSessionListItem,
  VisitSessionListResult,
  VisitSessionRecord,
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

type VisitJourneyRow = {
  session_hash: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

type VisitPageViewRow = {
  session_hash: string;
  sequence: string | number;
  path: string;
  title: string;
  started_at: string;
  ended_at: string;
  duration_ms: string | number;
};

type VisitEventRow = {
  session_hash: string;
  name: string;
  params?: Record<string, string | number | boolean | null>;
  sequence: string | number;
  path: string;
  occurred_at: string;
};

export class SupabaseVisitRepository implements IVisitRepository {
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {}

  async recordSession(record: VisitSessionRecord): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase visit session record',
      {
        operation: 'record_visit_session',
        sessionHash: record.sessionHash,
        pageViewCount: record.pageViews.length,
        eventCount: record.events.length,
        entryPath: record.entryPath,
      },
      async () => {
        const { error } = await this.client.rpc('record_visit_session', {
          p_session_hash: record.sessionHash,
          p_country_code: record.countryCode,
          p_region: record.region,
          p_city: record.city,
          p_timezone: record.timezone,
          p_language: record.language,
          p_referrer: record.referrer,
          p_source: record.source,
          p_medium: record.medium,
          p_campaign: record.campaign,
          p_term: record.term,
          p_content: record.content,
          p_click_id: record.clickId,
          p_entry_path: record.entryPath,
          p_events: record.events,
          p_page_views: record.pageViews,
          p_started_at: record.startedAt,
          p_last_seen_at: record.lastSeenAt,
        });

        if (error) throw error;
      }
    );
  }

  async getStat(metric: VisitStatMetric, range: VisitMetricRange): Promise<VisitStatResult> {
    return logOperation(
      this.logger,
      'Supabase visit stat query',
      { operation: 'get_visit_stat', metric, range },
      async () => {
        const { data, error } = await this.client.rpc('get_visit_stat', {
          p_metric: metric,
          p_range: range,
          p_now: new Date().toISOString(),
        });

        if (error) throw error;

        return (data || { metric, range, value: 0 }) as VisitStatResult;
      },
      result => ({ value: result.value })
    );
  }

  async getChart(range: VisitMetricRange, series: VisitChartSeries): Promise<VisitChartResult> {
    return logOperation(
      this.logger,
      'Supabase visit chart query',
      { operation: 'get_visit_chart', range, series },
      async () => {
        const { data, error } = await this.client.rpc('get_visit_chart', {
          p_range: range,
          p_series: series,
          p_now: new Date().toISOString(),
        });

        if (error) throw error;

        return (data || { range, series, points: [] }) as VisitChartResult;
      },
      result => ({ pointCount: result.points.length })
    );
  }

  async getBreakdown(
    metric: VisitBreakdownMetric,
    range: VisitMetricRange,
    {
      page = 1,
      pageSize = 10,
      sortBy = 'pageViews',
      sortDirection = 'desc',
    }: VisitBreakdownQuery = {}
  ): Promise<VisitBreakdownResult> {
    return logOperation(
      this.logger,
      'Supabase visit breakdown query',
      { operation: 'get_visit_breakdown', metric, range, page, pageSize, sortBy, sortDirection },
      async () => {
        const { data, error } = await this.client.rpc('get_visit_breakdown', {
          p_metric: metric,
          p_page: page,
          p_page_size: pageSize,
          p_range: range,
          p_sort_by: sortBy,
          p_sort_direction: sortDirection,
          p_now: new Date().toISOString(),
        });

        if (error) throw error;

        return (data || { metric, range, records: [] }) as VisitBreakdownResult;
      },
      result => ({ recordCount: result.records.length, totalRecords: result.pagination?.totalRecords })
    );
  }

  async listSessions({
    page = 1,
    pageSize = 10,
  }: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<VisitSessionListResult> {
    return this.listSessionRecords({ page, pageSize }, true);
  }

  async listAllSessions({
    page = 1,
    pageSize = 10,
  }: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<VisitSessionListResult> {
    return this.listSessionRecords({ page, pageSize }, false);
  }

  private async listSessionRecords(
    { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
    recentOnly: boolean
  ): Promise<VisitSessionListResult> {
    return logOperation(
      this.logger,
      'Supabase visit sessions query',
      { table: 'visit_sessions', recentOnly, page, pageSize },
      async () => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        let query = this.client
          .from('visit_sessions')
          .select(
            'session_hash, country_code, region, city, timezone, entry_path, referrer, source, medium, campaign, term, content, click_id, page_count, event_count, duration_ms, started_at, last_seen_at',
            {
              count: 'exact',
            }
          );

        if (recentOnly) query = query.gte('last_seen_at', getRecentVisitsCutoff());

        const { data, error, count } = await query
          .order('last_seen_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return {
          records: (data || []).map(toSessionRecord),
          pagination: {
            page,
            pageSize,
            totalRecords: count || 0,
            totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
          },
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.pagination.totalRecords })
    );
  }

  async listJourney(sessionHash: string): Promise<VisitJourneyEvent[]> {
    return logOperation(
      this.logger,
      'Supabase visit journey query',
      { sessionHash },
      async () => {
        const [sessionResult, pageViewsResult, eventsResult] = await Promise.all([
          this.client
            .from('visit_sessions')
            .select('session_hash, referrer, source, medium, campaign')
            .eq('session_hash', sessionHash)
            .single(),
          this.client
            .from('visit_page_views')
            .select('session_hash, sequence, path, title, started_at, ended_at, duration_ms')
            .eq('session_hash', sessionHash)
            .order('sequence', { ascending: true }),
          this.client
            .from('visit_events')
            .select('session_hash, name, params, sequence, path, occurred_at')
            .eq('session_hash', sessionHash)
            .neq('name', 'page_view')
            .order('sequence', { ascending: true }),
        ]);

        if (sessionResult.error) throw sessionResult.error;
        if (pageViewsResult.error) throw pageViewsResult.error;
        if (eventsResult.error) throw eventsResult.error;

        return createJourneyEvents(
          sessionResult.data as VisitJourneyRow,
          (pageViewsResult.data || []) as VisitPageViewRow[],
          (eventsResult.data || []) as VisitEventRow[]
        );
      },
      result => ({ eventCount: result.length })
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

function getRecentVisitsCutoff(): string {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);

  return cutoff.toISOString();
}

function createJourneyEvents(
  session: VisitJourneyRow,
  pageViews: VisitPageViewRow[],
  eventRows: VisitEventRow[]
): VisitJourneyEvent[] {
  const pageViewEvents = pageViews.map(pageView => ({
    sessionHash: pageView.session_hash,
    type: 'page_view' as const,
    name: 'page_view',
    params: {},
    sequence: pageView.sequence,
    path: pageView.path,
    title: pageView.title,
    countryCode: null,
    region: '',
    city: '',
    timezone: '',
    referrer: session.referrer,
    source: session.source,
    medium: session.medium,
    campaign: session.campaign,
    term: null,
    content: null,
    clickId: null,
    visitedAt: pageView.started_at,
    endedAt: pageView.ended_at,
    durationMs: pageView.duration_ms,
  }));

  const events = eventRows
    .filter(event => event.name && event.occurred_at)
    .map(event => ({
      sessionHash: event.session_hash,
      type: 'event' as const,
      name: event.name,
      params: event.params || {},
      sequence: event.sequence || 0,
      path: event.path || String(event.params?.page_path || ''),
      title: event.name,
      countryCode: null,
      region: '',
      city: '',
      timezone: '',
      referrer: session.referrer,
      source: session.source,
      medium: session.medium,
      campaign: session.campaign,
      term: null,
      content: null,
      clickId: null,
      visitedAt: event.occurred_at,
      endedAt: event.occurred_at,
      durationMs: 0,
    }));

  return [...pageViewEvents, ...events].sort(compareJourneyEvents);
}

function compareJourneyEvents(first: VisitJourneyEvent, second: VisitJourneyEvent): number {
  const firstSequence = Number(first.sequence);
  const secondSequence = Number(second.sequence);

  if (Number.isFinite(firstSequence) && Number.isFinite(secondSequence)) {
    return firstSequence - secondSequence;
  }

  return Date.parse(first.visitedAt || '') - Date.parse(second.visitedAt || '');
}
