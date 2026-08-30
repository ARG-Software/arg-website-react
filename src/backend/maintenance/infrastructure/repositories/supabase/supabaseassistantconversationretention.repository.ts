import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';

export class SupabaseAssistantConversationRetentionRepository {
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {}

  async deleteOlderThan(cutoffIso: string): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase old assistant conversations delete',
      { table: 'assistant_conversations', cutoffIso },
      async () => {
        const { count, error } = await this.client
          .from('assistant_conversations')
          .delete({ count: 'exact' })
          .lt('updated_at', cutoffIso);

        if (error) throw error;

        return count || 0;
      },
      deletedCount => ({ deletedCount })
    );
  }
}
