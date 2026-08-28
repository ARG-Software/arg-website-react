import { createHash } from 'node:crypto';

const MINUTE_SECONDS = 60;
const DAY_SECONDS = 86_400;

export interface IRateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface IRateLimitStore {
  hit(bucket: string, windowSeconds: number, limit: number): Promise<IRateLimitResult>;
}

export interface IRateLimitConfig {
  perMinute: number;
  perDay: number;
  globalDaily: number;
  salt: string;
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

export async function checkRateLimits(
  ip: string,
  store: IRateLimitStore,
  config: IRateLimitConfig
): Promise<IRateLimitResult> {
  const ipHash = hashIp(ip, config.salt);
  const checks = [
    { bucket: getMinuteBucket(ipHash), windowSeconds: MINUTE_SECONDS, limit: config.perMinute },
    { bucket: getDayBucket(ipHash), windowSeconds: DAY_SECONDS, limit: config.perDay },
    { bucket: getGlobalDayBucket(), windowSeconds: DAY_SECONDS, limit: config.globalDaily },
  ];

  for (const check of checks) {
    const result = await store.hit(check.bucket, check.windowSeconds, check.limit);

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}
