import type { SupabaseClient } from '@supabase/supabase-js';

import type { RateLimitResult, RateLimitStore } from './rateLimit.js';

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; windowStart: number }>();

  async hit(bucket: string, windowSeconds: number, limit: number): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.buckets.get(bucket);

    if (!entry || entry.windowStart + windowSeconds <= now) {
      this.buckets.set(bucket, { count: 1, windowStart: now });
      return { allowed: true };
    }

    entry.count += 1;

    if (entry.count > limit) {
      const retryAfter = entry.windowStart + windowSeconds - now;
      return { allowed: false, retryAfterSeconds: retryAfter };
    }

    return { allowed: true };
  }
}

export class SupabaseRateLimitStore implements RateLimitStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async hit(bucket: string, windowSeconds: number, limit: number): Promise<RateLimitResult> {
    const { data, error } = await this.supabase.rpc('hit_rag_rate_limit', {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });

    if (error) {
      console.error('Rate limit store error, failing open:', error);
      return { allowed: true };
    }

    const result = data as { allowed: boolean; retry_after_seconds: number };

    return {
      allowed: result.allowed,
      retryAfterSeconds: result.allowed ? undefined : result.retry_after_seconds,
    };
  }
}
