import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMinuteBucket,
  getDayBucket,
  getGlobalDayBucket,
  hashIp,
  RateLimiter,
  type IRateLimitConfig,
} from '../../../shared/security/ratelimit.js';
import { InMemoryRateLimitRepository } from '../fakes/inmemoryratelimit.repository.js';

function createConfig(overrides: Partial<IRateLimitConfig> = {}): IRateLimitConfig {
  return {
    perMinute: 3,
    perDay: 10,
    globalDaily: 50,
    salt: 'test-salt',
    ...overrides,
  };
}

test('requests within limits are allowed', async () => {
  const limiter = new RateLimiter(new InMemoryRateLimitRepository(), createConfig());

  const result = await limiter.check('192.168.1.1');

  assert.equal(result.allowed, true);
  assert.equal(result.retryAfterSeconds, undefined);
  assert.equal(result.scope, undefined);
});

test('requests exceeding per-minute limit are denied', async () => {
  const limiter = new RateLimiter(new InMemoryRateLimitRepository(), createConfig({ perMinute: 2 }));
  const ip = '10.0.0.1';

  await limiter.check(ip);
  await limiter.check(ip);
  const result = await limiter.check(ip);

  assert.equal(result.allowed, false);
  assert.equal(result.scope, 'minute');
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds > 0);
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds <= 60);
});

test('requests exceeding per-day limit are denied', async () => {
  const limiter = new RateLimiter(
    new InMemoryRateLimitRepository(),
    createConfig({ perDay: 2, perMinute: 100 })
  );
  const ip = '10.0.0.2';

  await limiter.check(ip);
  await limiter.check(ip);
  const result = await limiter.check(ip);

  assert.equal(result.allowed, false);
  assert.equal(result.scope, 'day');
  assert.ok(result.retryAfterSeconds != null && result.retryAfterSeconds > 0);
});

test('global daily limit is shared across IPs', async () => {
  const limiter = new RateLimiter(
    new InMemoryRateLimitRepository(),
    createConfig({ globalDaily: 2, perMinute: 100, perDay: 100 })
  );

  await limiter.check('10.0.0.1');
  await limiter.check('10.0.0.2');
  const result = await limiter.check('10.0.0.3');

  assert.equal(result.allowed, false);
  assert.equal(result.scope, 'global_day');
});

test('different IPs have independent per-minute limits', async () => {
  const limiter = new RateLimiter(
    new InMemoryRateLimitRepository(),
    createConfig({ perMinute: 2, perDay: 100, globalDaily: 100 })
  );

  await limiter.check('10.0.0.1');
  await limiter.check('10.0.0.1');
  const blockedSame = await limiter.check('10.0.0.1');

  assert.equal(blockedSame.allowed, false);

  const allowedDifferent = await limiter.check('10.0.0.2');

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
  const repository = new InMemoryRateLimitRepository();

  const first = await repository.hit('test-bucket', 60, 1);
  assert.equal(first.allowed, true);

  const second = await repository.hit('test-bucket', 60, 1);
  assert.equal(second.allowed, false);
});
