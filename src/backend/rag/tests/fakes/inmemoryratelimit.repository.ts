import type {
  IRateLimitRepository,
  IRateLimitResult,
} from '../../../shared/security/ratelimit.js';

export class InMemoryRateLimitRepository implements IRateLimitRepository {
  private readonly buckets = new Map<string, { count: number; windowStart: number }>();

  async hit(bucket: string, windowSeconds: number, limit: number): Promise<IRateLimitResult> {
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
