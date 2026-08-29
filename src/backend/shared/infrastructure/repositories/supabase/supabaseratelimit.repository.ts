import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../logger/ilogger.js';
import type { IRateLimitRepository, IRateLimitResult } from '../../../security/ratelimit.js';

export class SupabaseRateLimitRepository implements IRateLimitRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly rpcName = 'hit_rag_rate_limit',
    private readonly logger?: ILogger
  ) {}

  async hit(bucket: string, windowSeconds: number, limit: number): Promise<IRateLimitResult> {
    const { data, error } = await this.supabase.rpc(this.rpcName, {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });

    if (error) {
      this.logger?.error('Rate limit repository failed open', { error, rpcName: this.rpcName });
      return { allowed: true };
    }

    const result = data as { allowed: boolean; retry_after_seconds: number };

    return {
      allowed: result.allowed,
      retryAfterSeconds: result.allowed ? undefined : result.retry_after_seconds,
    };
  }
}
