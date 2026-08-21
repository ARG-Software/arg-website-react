export class InMemoryRateLimitStore {
  buckets = new Map();

  async hit(bucket, windowSeconds, limit) {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.buckets.get(bucket);

    if (!entry || entry.windowStart + windowSeconds <= now) {
      this.buckets.set(bucket, { count: 1, windowStart: now });
      return { allowed: true };
    }

    entry.count += 1;

    if (entry.count > limit) {
      return { allowed: false, retryAfterSeconds: entry.windowStart + windowSeconds - now };
    }

    return { allowed: true };
  }
}

export class SupabaseRateLimitStore {
  constructor(supabase, rpcName = 'hit_rag_rate_limit') {
    this.supabase = supabase;
    this.rpcName = rpcName;
  }

  async hit(bucket, windowSeconds, limit) {
    const { data, error } = await this.supabase.rpc(this.rpcName, {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });

    if (error) {
      console.error('Rate limit store error, failing open:', error);
      return { allowed: true };
    }

    return {
      allowed: data.allowed,
      retryAfterSeconds: data.allowed ? undefined : data.retry_after_seconds,
    };
  }
}
