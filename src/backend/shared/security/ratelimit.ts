import { createHash } from 'node:crypto';

const MINUTE_SECONDS = 60;
const DAY_SECONDS = 86_400;

export type RateLimitScope = 'minute' | 'day' | 'global_day';

export interface IRateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  scope?: RateLimitScope;
}

export interface IRateLimiter {
  check(ip: string): Promise<IRateLimitResult>;
}

export interface IRateLimitRepository {
  hit(bucket: string, windowSeconds: number, limit: number): Promise<IRateLimitResult>;
}

export interface IRateLimitConfig {
  perMinute: number;
  perDay: number;
  globalDaily: number;
  salt: string;
}

export class RateLimiter implements IRateLimiter {
  constructor(
    private readonly repository: IRateLimitRepository,
    private readonly config: IRateLimitConfig
  ) {}

  async check(ip: string): Promise<IRateLimitResult> {
    const ipHash = hashIp(ip, this.config.salt);
    const checks = [
      {
        bucket: getMinuteBucket(ipHash),
        windowSeconds: MINUTE_SECONDS,
        limit: this.config.perMinute,
        scope: 'minute' as const,
      },
      {
        bucket: getDayBucket(ipHash),
        windowSeconds: DAY_SECONDS,
        limit: this.config.perDay,
        scope: 'day' as const,
      },
      {
        bucket: getGlobalDayBucket(),
        windowSeconds: DAY_SECONDS,
        limit: this.config.globalDaily,
        scope: 'global_day' as const,
      },
    ];

    for (const check of checks) {
      const result = await this.repository.hit(check.bucket, check.windowSeconds, check.limit);

      if (!result.allowed) {
        return { ...result, scope: check.scope };
      }
    }

    return { allowed: true };
  }
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex').slice(0, 16);
}

export function getMinuteBucket(ipHash: string): string {
  const minute = Math.floor(Date.now() / (MINUTE_SECONDS * 1000));
  return `ip:${ipHash}:m:${minute}`;
}

export function getDayBucket(ipHash: string): string {
  const day = Math.floor(Date.now() / (DAY_SECONDS * 1000));
  return `ip:${ipHash}:d:${day}`;
}

export function getGlobalDayBucket(): string {
  const day = Math.floor(Date.now() / (DAY_SECONDS * 1000));
  return `global:d:${day}`;
}
