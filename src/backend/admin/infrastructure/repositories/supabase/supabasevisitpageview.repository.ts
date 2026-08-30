import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IVisitPageViewRepository,
  VisitMetricPageViewRecord,
  VisitMetricRangeQuery,
  VisitPageViewRecord,
} from '../../../application/ports/repositories/ivisitpageview.repository.js';

type VisitPageViewRow = {
  session_hash: string;
  sequence: string | number;
  path: string;
  title: string;
  started_at: string;
  ended_at: string;
  duration_ms: string | number;
};

type VisitMetricPageViewRow = {
  session_hash: string;
  path: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: string | number | null;
};

export class SupabaseVisitPageViewRepository implements IVisitPageViewRepository {
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {}

  async findForMetricRange(query: VisitMetricRangeQuery): Promise<VisitMetricPageViewRecord[]> {
    return logOperation(
      this.logger,
      'Supabase visit page views metric query',
      { table: 'visit_page_views', ...query },
      async () => {
        const rows: VisitMetricPageViewRow[] = [];
        const pageSize = 1000;
        let from = 0;

        for (;;) {
          let request = this.client
            .from('visit_page_views')
            .select('session_hash, path, started_at, ended_at, duration_ms')
            .lt('started_at', query.toIso)
            .order('started_at', { ascending: true })
            .range(from, from + pageSize - 1);

          if (query.fromIso) request = request.gte('started_at', query.fromIso);

          const { data, error } = await request;
          if (error) throw error;

          rows.push(...((data || []) as VisitMetricPageViewRow[]));
          if (!data || data.length < pageSize) break;

          from += pageSize;
        }

        return rows.map(toMetricPageViewRecord);
      },
      records => ({ recordCount: records.length })
    );
  }

  async findBySessionHash(sessionHash: string): Promise<VisitPageViewRecord[]> {
    return logOperation(
      this.logger,
      'Supabase visit page views journey query',
      { table: 'visit_page_views', sessionHash },
      async () => {
        const { data, error } = await this.client
          .from('visit_page_views')
          .select('session_hash, sequence, path, title, started_at, ended_at, duration_ms')
          .eq('session_hash', sessionHash)
          .order('sequence', { ascending: true });

        if (error) throw error;

        return ((data || []) as VisitPageViewRow[]).map(toPageViewRecord);
      },
      records => ({ recordCount: records.length })
    );
  }
}

function toMetricPageViewRecord(row: VisitMetricPageViewRow): VisitMetricPageViewRecord {
  return {
    sessionHash: row.session_hash,
    path: row.path,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
  };
}

function toPageViewRecord(row: VisitPageViewRow): VisitPageViewRecord {
  return {
    sessionHash: row.session_hash,
    sequence: row.sequence,
    path: row.path,
    title: row.title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
  };
}
