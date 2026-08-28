import type { SupabaseClient } from '@supabase/supabase-js';

import type { IVisitRepository } from '../../../application/ports/repositories/ivisit.repository.js';
import type {
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
  constructor(private readonly client: SupabaseClient) {}

  async recordSession(record: VisitSessionRecord): Promise<void> {
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

  async getStat(metric: VisitStatMetric, range: VisitMetricRange): Promise<VisitStatResult> {
    const { data, error } = await this.client.rpc('get_visit_stat', {
      p_metric: metric,
      p_range: range,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    return (data || { metric, range, value: 0 }) as VisitStatResult;
  }

  async getChart(range: VisitMetricRange, series: VisitChartSeries): Promise<VisitChartResult> {
    const { data, error } = await this.client.rpc('get_visit_chart', {
      p_range: range,
      p_series: series,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    return (data || { range, series, points: [] }) as VisitChartResult;
  }

  async getBreakdown(
    metric: VisitBreakdownMetric,
    range: VisitMetricRange
  ): Promise<VisitBreakdownResult> {
    const { data, error } = await this.client.rpc('get_visit_breakdown', {
      p_metric: metric,
      p_range: range,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    return (data || { metric, range, records: [] }) as VisitBreakdownResult;
  }

  async listSessions({
    page = 1,
    pageSize = 10,
  }: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<VisitSessionListResult> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await this.client
      .from('visit_sessions')
      .select(
        'session_hash, country_code, region, city, timezone, entry_path, referrer, source, medium, campaign, term, content, click_id, page_count, event_count, duration_ms, started_at, last_seen_at',
        {
          count: 'exact',
        }
      )
      .gte('last_seen_at', getRecentVisitsCutoff())
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
  }

  async listJourney(sessionHash: string): Promise<VisitJourneyEvent[]> {
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
  }

  async deleteById(sessionHash: string): Promise<void> {
    const { error } = await this.client
      .from('visit_sessions')
      .delete()
      .eq('session_hash', sessionHash);

    if (error) throw error;
  }

  async deleteOlderThan(cutoffIso: string): Promise<{ events: number; sessions: number }> {
    const { count: sessionCount, error: sessionError } = await this.client
      .from('visit_sessions')
      .delete({ count: 'exact' })
      .lt('last_seen_at', cutoffIso);

    if (sessionError) throw sessionError;

    return {
      events: 0,
      sessions: sessionCount || 0,
    };
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
