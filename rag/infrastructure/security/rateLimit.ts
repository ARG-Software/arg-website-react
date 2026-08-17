import { createHash } from 'node:crypto';

const DEFAULT_PER_MINUTE = 6;
const DEFAULT_PER_DAY = 30;
const DEFAULT_GLOBAL_DAILY = 500;
const MINUTE_SECONDS = 60;
const DAY_SECONDS = 86_400;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  hit(bucket: string, windowSeconds: number, limit: number): Promise<RateLimitResult>;
}

export interface RateLimitConfig {
  perMinute: number;
  perDay: number;
  globalDaily: number;
  salt: string;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    perMinute: getNumberEnv('RAG_ASK_RATE_LIMIT_PER_MINUTE', DEFAULT_PER_MINUTE),
    perDay: getNumberEnv('RAG_ASK_RATE_LIMIT_PER_DAY', DEFAULT_PER_DAY),
    globalDaily: getNumberEnv('RAG_ASK_GLOBAL_RATE_LIMIT_PER_DAY', DEFAULT_GLOBAL_DAILY),
    salt: process.env.RAG_ASK_RATE_LIMIT_SALT || 'arg-ask-rate-limit',
  };
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
  store: RateLimitStore,
  config: RateLimitConfig = getRateLimitConfig()
): Promise<RateLimitResult> {
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

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
