import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { ITableKeepAliveProbe } from '../../../application/ports/itablekeepaliveprobe.js';

export class SupabaseTableKeepAliveProbe implements ITableKeepAliveProbe {
  constructor(
    private readonly client: SupabaseClient,
    private readonly tableName: string,
    private readonly logger?: ILogger
  ) {}

  async touch(): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase maintenance table keepalive',
      { table: this.tableName },
      async () => {
        const { error } = await this.client.from(this.tableName).select('id').limit(1);

        if (error) throw error;
      }
    );
  }
}
