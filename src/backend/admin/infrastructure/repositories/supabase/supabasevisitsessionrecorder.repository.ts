import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IVisitSessionRecorderRepository } from '../../../application/ports/repositories/ivisitsessionrecorder.repository.js';
import type { VisitSessionRecord } from '../../../domain/types/visitsession.types.js';

export class SupabaseVisitSessionRecorderRepository implements IVisitSessionRecorderRepository {
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
}
