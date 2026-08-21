import { createHash } from 'node:crypto';

const DEFAULT_PER_MINUTE = 6;
const DEFAULT_PER_DAY = 30;
const DEFAULT_GLOBAL_DAILY = 500;
const MINUTE_SECONDS = 60;
const DAY_SECONDS = 86_400;

export function getRateLimitConfig(
  env = process.env,
  { prefix = 'RAG_ASK', saltName, defaultSalt = 'arg-rate-limit' } = {}
) {
  return {
    perMinute: getNumberEnv(env, `${prefix}_RATE_LIMIT_PER_MINUTE`, DEFAULT_PER_MINUTE),
    perDay: getNumberEnv(env, `${prefix}_RATE_LIMIT_PER_DAY`, DEFAULT_PER_DAY),
    globalDaily: getNumberEnv(env, `${prefix}_GLOBAL_RATE_LIMIT_PER_DAY`, DEFAULT_GLOBAL_DAILY),
    salt: env[saltName || `${prefix}_RATE_LIMIT_SALT`] || defaultSalt,
  };
}

export function hashIp(ip, salt) {
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex').slice(0, 16);
}

export function getMinuteBucket(ipHash) {
  const minute = Math.floor(Date.now() / (MINUTE_SECONDS * 1000));
  return `ip:${ipHash}:m:${minute}`;
}

export function getDayBucket(ipHash) {
  const day = Math.floor(Date.now() / (DAY_SECONDS * 1000));
  return `ip:${ipHash}:d:${day}`;
}

export function getGlobalDayBucket() {
  const day = Math.floor(Date.now() / (DAY_SECONDS * 1000));
  return `global:d:${day}`;
}

export async function checkRateLimits(ip, store, config = getRateLimitConfig()) {
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

function getNumberEnv(env, name, fallback) {
  const value = env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
