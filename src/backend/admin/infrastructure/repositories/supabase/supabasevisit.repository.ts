import type { SupabaseClient } from '@supabase/supabase-js';

import type { IVisitRepository } from '../../../application/ports/repositories/ivisit.repository.js';
import type {
  VisitJourneyEvent,
  VisitMetricsData,
  VisitSessionListItem,
  VisitSessionListResult,
  VisitSessionRecord,
} from '../../../domain/types/visit.types.js';

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
  country_code: string | null;
  region: string;
  city: string;
  timezone: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  click_id: string | null;
  page_views?: Array<{
    sequence: string | number;
    path: string;
    title: string;
    startedAt: string;
    endedAt: string;
    durationMs: string | number;
  }>;
  events?: Array<{
    name: string;
    params?: Record<string, string | number | boolean | null>;
    sequence: string | number;
    timestamp: string;
    path: string;
  }>;
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

  async getMetrics(range: string = '30d'): Promise<VisitMetricsData> {
    const { data, error } = await this.client.rpc('aggregate_visit_metrics', {
      p_range: range,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    return data || {};
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
    const { data, error } = await this.client
      .from('visit_sessions')
      .select(
        'session_hash, country_code, region, city, timezone, referrer, source, medium, campaign, term, content, click_id, page_views, events'
      )
      .eq('session_hash', sessionHash)
      .single();

    if (error) throw error;

    return createJourneyEvents(data);
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

function createJourneyEvents(row: VisitJourneyRow): VisitJourneyEvent[] {
  const pageViewEvents = (row?.page_views || []).map(pageView => ({
    sessionHash: row.session_hash,
    type: 'page_view' as const,
    name: 'page_view',
    params: {},
    sequence: pageView.sequence,
    path: pageView.path,
    title: pageView.title,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    timezone: row.timezone,
    referrer: row.referrer,
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    term: row.term,
    content: row.content,
    clickId: row.click_id,
    visitedAt: pageView.startedAt,
    endedAt: pageView.endedAt,
    durationMs: pageView.durationMs,
  }));

  const events = (row?.events || [])
    .filter(event => event.name && event.timestamp && event.name !== 'page_view')
    .map(event => ({
      sessionHash: row.session_hash,
      type: 'event' as const,
      name: event.name,
      params: event.params || {},
      sequence: event.sequence || 0,
      path: event.path || String(event.params?.page_path || ''),
      title: event.name,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      timezone: row.timezone,
      referrer: row.referrer,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      term: row.term,
      content: row.content,
      clickId: row.click_id,
      visitedAt: event.timestamp,
      endedAt: event.timestamp,
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
