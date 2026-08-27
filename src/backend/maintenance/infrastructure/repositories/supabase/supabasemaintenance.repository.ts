import type { SupabaseClient } from '@supabase/supabase-js';

import type { IMaintenanceRepository } from '../../../application/ports/repositories/imaintenance.repository.js';

export class SupabaseMaintenanceRepository implements IMaintenanceRepository {
  constructor(
    private readonly adminClient: SupabaseClient,
    private readonly ragClient: SupabaseClient
  ) {}

  async deleteOldAssistantConversations(cutoffIso: string): Promise<number> {
    const { count, error } = await this.adminClient
      .from('assistant_conversations')
      .delete({ count: 'exact' })
      .lt('updated_at', cutoffIso);

    if (error) throw error;

    return count || 0;
  }

  async deleteOldVisitSessions(cutoffIso: string): Promise<{ events: number; sessions: number }> {
    const { count: sessionCount, error: sessionError } = await this.adminClient
      .from('visit_sessions')
      .delete({ count: 'exact' })
      .lt('last_seen_at', cutoffIso);

    if (sessionError) throw sessionError;

    return {
      events: 0,
      sessions: sessionCount || 0,
    };
  }

  async keepDatabasesAlive(): Promise<void> {
    await Promise.all([
      this.keepAlive(this.ragClient, 'rag_sources'),
      this.keepAlive(this.adminClient, 'outreach_records'),
    ]);
  }

  private async keepAlive(client: SupabaseClient, tableName: string): Promise<void> {
    const { error } = await client.from(tableName).select('id').limit(1);

    if (error) throw error;
  }
}
