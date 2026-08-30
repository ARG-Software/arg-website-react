import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IVisitEventRepository,
  VisitEventRecord,
  VisitMetricEventRecord,
} from '../../../application/ports/repositories/ivisitevent.repository.js';
import type { VisitMetricRangeQuery } from '../../../application/ports/repositories/ivisitpageview.repository.js';

type VisitMetricEventRow = {
  session_hash: string;
  occurred_at: string;
};

type VisitEventRow = {
  session_hash: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  sequence: string | number | null;
  path: string | null;
  occurred_at: string;
};

export class SupabaseVisitEventRepository implements IVisitEventRepository {
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {}

  async findForMetricRange(query: VisitMetricRangeQuery): Promise<VisitMetricEventRecord[]> {
    return logOperation(
      this.logger,
      'Supabase visit events metric query',
      { table: 'visit_events', ...query },
      async () => {
        const rows: VisitMetricEventRow[] = [];
        const pageSize = 1000;
        let from = 0;

        for (;;) {
          let request = this.client
            .from('visit_events')
            .select('session_hash, occurred_at')
            .lt('occurred_at', query.toIso)
            .order('occurred_at', { ascending: true })
            .range(from, from + pageSize - 1);

          if (query.fromIso) request = request.gte('occurred_at', query.fromIso);

          const { data, error } = await request;
          if (error) throw error;

          rows.push(...((data || []) as VisitMetricEventRow[]));
          if (!data || data.length < pageSize) break;

          from += pageSize;
        }

        return rows.map(toMetricEventRecord);
      },
      records => ({ recordCount: records.length })
    );
  }

  async findBySessionHash(sessionHash: string): Promise<VisitEventRecord[]> {
    return logOperation(
      this.logger,
      'Supabase visit events journey query',
      { table: 'visit_events', sessionHash },
      async () => {
        const { data, error } = await this.client
          .from('visit_events')
          .select('session_hash, name, params, sequence, path, occurred_at')
          .eq('session_hash', sessionHash)
          .neq('name', 'page_view')
          .order('sequence', { ascending: true });

        if (error) throw error;

        return ((data || []) as VisitEventRow[]).map(toEventRecord);
      },
      records => ({ recordCount: records.length })
    );
  }
}

function toMetricEventRecord(row: VisitMetricEventRow): VisitMetricEventRecord {
  return {
    sessionHash: row.session_hash,
    occurredAt: row.occurred_at,
  };
}

function toEventRecord(row: VisitEventRow): VisitEventRecord {
  return {
    sessionHash: row.session_hash,
    name: row.name,
    params: row.params || {},
    sequence: row.sequence || 0,
    path: row.path || String(row.params?.page_path || ''),
    occurredAt: row.occurred_at,
  };
}
