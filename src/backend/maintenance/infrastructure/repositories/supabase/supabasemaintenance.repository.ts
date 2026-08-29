import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IMaintenanceRepository } from '../../../application/ports/repositories/imaintenance.repository.js';

export class SupabaseMaintenanceRepository implements IMaintenanceRepository {
  constructor(
    private readonly adminClient: SupabaseClient,
    private readonly ragClient: SupabaseClient,
    private readonly logger?: ILogger
  ) {}

  async deleteOldAssistantConversations(cutoffIso: string): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase maintenance assistant conversation retention delete',
      { table: 'assistant_conversations', cutoffIso },
      async () => {
        const { count, error } = await this.adminClient
          .from('assistant_conversations')
          .delete({ count: 'exact' })
          .lt('updated_at', cutoffIso);

        if (error) throw error;

        return count || 0;
      },
      deletedCount => ({ deletedCount })
    );
  }

  async deleteOldVisitSessions(cutoffIso: string): Promise<{ events: number; sessions: number }> {
    return logOperation(
      this.logger,
      'Supabase maintenance visit retention delete',
      { table: 'visit_sessions', cutoffIso },
      async () => {
        const { count: sessionCount, error: sessionError } = await this.adminClient
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

  async keepDatabasesAlive(): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase maintenance database keepalive',
      { tables: ['rag_sources', 'outreach_records'] },
      () =>
        Promise.all([
          this.keepAlive(this.ragClient, 'rag_sources'),
          this.keepAlive(this.adminClient, 'outreach_records'),
        ]).then(() => undefined)
    );
  }

  private async keepAlive(client: SupabaseClient, tableName: string): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase maintenance table keepalive',
      { table: tableName },
      async () => {
        const { error } = await client.from(tableName).select('id').limit(1);

        if (error) throw error;
      }
    );
  }
}
