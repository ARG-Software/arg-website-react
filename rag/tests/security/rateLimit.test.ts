import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkRateLimits,
  getMinuteBucket,
  getDayBucket,
  getGlobalDayBucket,
  hashIp,
  type RateLimitConfig,
} from '../../security/rateLimit.js';
import { InMemoryRateLimitStore } from '../../security/rateLimitStores.js';

function createConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
  return {
    perMinute: 3,
    perDay: 10,
    globalDaily: 50,
    salt: 'test-salt',
    ...overrides,
  };
}

test('requests within limits are allowed', async () => {
  const store = new InMemoryRateLimitStore();
  const config = createConfig();

  const result = await checkRateLimits('192.168.1.1', store, config);

  assert.equal(result.allowed, true);
  assert.equal(result.retryAfterSeconds, undefined);
});

test('requests exceeding per-minute limit are denied', async () => {
  const store = new InMemoryRateLimitStore();
  const config = createConfig({ perMinute: 2 });
  const ip = '10.0.0.1';

  await checkRateLimits(ip, store, config);
  await checkRateLimits(ip, store, config);
  const result = await checkRateLimits(ip, store, config);

  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds > 0);
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds <= 60);
});

test('requests exceeding per-day limit are denied', async () => {
  const store = new InMemoryRateLimitStore();
  const config = createConfig({ perDay: 2, perMinute: 100 });
  const ip = '10.0.0.2';

  await checkRateLimits(ip, store, config);
  await checkRateLimits(ip, store, config);
  const result = await checkRateLimits(ip, store, config);

  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds > 0);
});

test('global daily limit is shared across IPs', async () => {
  const store = new InMemoryRateLimitStore();
  const config = createConfig({ globalDaily: 2, perMinute: 100, perDay: 100 });

  await checkRateLimits('10.0.0.1', store, config);
  await checkRateLimits('10.0.0.2', store, config);
  const result = await checkRateLimits('10.0.0.3', store, config);

  assert.equal(result.allowed, false);
});

test('different IPs have independent per-minute limits', async () => {
  const store = new InMemoryRateLimitStore();
  const config = createConfig({ perMinute: 2, perDay: 100, globalDaily: 100 });

  await checkRateLimits('10.0.0.1', store, config);
  await checkRateLimits('10.0.0.1', store, config);
  const blockedSame = await checkRateLimits('10.0.0.1', store, config);

  assert.equal(blockedSame.allowed, false);

  const allowedDifferent = await checkRateLimits('10.0.0.2', store, config);

  assert.equal(allowedDifferent.allowed, true);
});

test('hashIp produces consistent hashes', () => {
  const hash1 = hashIp('192.168.1.1', 'salt');
  const hash2 = hashIp('192.168.1.1', 'salt');
  const hash3 = hashIp('192.168.1.2', 'salt');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(hash1.length, 16);
});

test('bucket names include time windows', () => {
  const bucket1 = getMinuteBucket('abc');
  const bucket2 = getDayBucket('abc');
  const bucket3 = getGlobalDayBucket();

  assert.ok(bucket1.includes('abc'));
  assert.ok(bucket1.includes(':m:'));
  assert.ok(bucket2.includes(':d:'));
  assert.ok(bucket3.startsWith('global:'));
});

test('in-memory store resets expired windows', async () => {
  const store = new InMemoryRateLimitStore();

  const first = await store.hit('test-bucket', 60, 1);
  assert.equal(first.allowed, true);

  const second = await store.hit('test-bucket', 60, 1);
  assert.equal(second.allowed, false);
});
