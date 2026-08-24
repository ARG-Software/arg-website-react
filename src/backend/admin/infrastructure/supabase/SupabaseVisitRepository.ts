import type { IVisitRepository } from '../../application/ports/repositories/IVisitRepository.js';

export class SupabaseVisitRepository implements IVisitRepository {
  constructor(private readonly client: any) {}

  async recordSession(record) {
    const { error } = await this.client.rpc('record_visit_session', {
      p_session_hash: record.sessionHash,
      p_country_code: record.countryCode,
      p_region: record.region,
      p_city: record.city,
      p_timezone: record.timezone,
      p_language: record.language,
      p_referrer: record.referrer,
      p_entry_path: record.entryPath,
      p_events: record.events,
      p_page_views: record.pageViews,
      p_started_at: record.startedAt,
      p_last_seen_at: record.lastSeenAt,
    });

    if (error) throw error;
  }

  async getMetrics(range = '30d') {
    const { data, error } = await this.client.rpc('aggregate_visit_metrics', {
      p_range: range,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    return data || {};
  }

  async listSessions({ page = 1, pageSize = 10 } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await this.client
      .from('visit_sessions')
      .select(
        'session_hash, country_code, region, city, timezone, entry_path, referrer, page_count, event_count, duration_ms, started_at, last_seen_at',
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

  async listJourney(sessionHash) {
    const { data, error } = await this.client
      .from('visit_sessions')
      .select('session_hash, country_code, region, city, timezone, referrer, page_views')
      .eq('session_hash', sessionHash)
      .single();

    if (error) throw error;

    return createJourneyEvents(data);
  }

  async deleteOlderThan(cutoffIso) {
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

function toSessionRecord(row) {
  return {
    id: row.session_hash,
    sessionHash: row.session_hash,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    timezone: row.timezone,
    entryPath: row.entry_path,
    referrer: row.referrer,
    pageCount: row.page_count,
    eventCount: row.event_count,
    durationMs: row.duration_ms,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
  };
}

function createJourneyEvents(row) {
  return (row?.page_views || []).map(pageView => ({
    sessionHash: row.session_hash,
    sequence: pageView.sequence,
    path: pageView.path,
    title: pageView.title,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    timezone: row.timezone,
    referrer: row.referrer,
    visitedAt: pageView.startedAt,
    endedAt: pageView.endedAt,
    durationMs: pageView.durationMs,
  }));
}
