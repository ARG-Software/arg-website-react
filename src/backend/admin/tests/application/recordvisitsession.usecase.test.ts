import assert from 'node:assert/strict';
import test from 'node:test';

import { RecordVisitSessionUseCase } from '../../application/usecases/visits/recordvisitsession.usecase.js';
import type { VisitSessionRecord } from '../../domain/types/visitsession.types.js';

test('recordVisitSessionUseCase records geolocation provided by the HTTP boundary', async () => {
  let savedRecord: VisitSessionRecord | null = null;
  const useCase = new RecordVisitSessionUseCase(
    { getVisitHashKey: () => 'visit-hash-key' } as any,
    {
      recordSession: async record => {
        savedRecord = record;
      },
    } as any,
    {
      config: { perMinute: 100, perDay: 100, globalDaily: 100, salt: 'visit-rate-limit' },
      store: { hit: async () => ({ allowed: true }) },
    }
  );

  await useCase.execute({
    clientIp: '203.0.113.10',
    sessionId: 'visitor-session',
    geo: {
      countryCode: 'PT',
      region: 'Madeira',
      city: 'Canico',
      timezone: 'Atlantic/Madeira',
    },
    pageViews: [
      {
        path: '/',
        title: 'ARG Software',
        sequence: 1,
        startedAt: '2026-08-28T10:00:00.000Z',
        endedAt: '2026-08-28T10:00:05.000Z',
        durationMs: 5000,
      },
    ],
  });

  assert.ok(savedRecord);
  assert.equal(savedRecord.countryCode, 'PT');
  assert.equal(savedRecord.region, 'Madeira');
  assert.equal(savedRecord.city, 'Canico');
  assert.equal(savedRecord.timezone, 'Atlantic/Madeira');
});

test('recordVisitSessionUseCase records empty geolocation when none is provided', async () => {
  let savedRecord: VisitSessionRecord | null = null;
  const useCase = new RecordVisitSessionUseCase(
    { getVisitHashKey: () => 'visit-hash-key' } as any,
    {
      recordSession: async record => {
        savedRecord = record;
      },
    } as any,
    {
      config: { perMinute: 100, perDay: 100, globalDaily: 100, salt: 'visit-rate-limit' },
      store: { hit: async () => ({ allowed: true }) },
    }
  );

  await useCase.execute({
    clientIp: '203.0.113.10',
    sessionId: 'visitor-session',
    geo: {},
    events: [
      {
        name: 'page_view',
        params: { page_path: '/' },
        sequence: 1,
        timestamp: '2026-08-28T10:00:00.000Z',
        path: '/',
      },
    ],
  });

  assert.ok(savedRecord);
  assert.equal(savedRecord.countryCode, null);
  assert.equal(savedRecord.region, '');
  assert.equal(savedRecord.city, '');
  assert.equal(savedRecord.timezone, '');
});

test('recordVisitSessionUseCase records visit attribution fields', async () => {
  let savedRecord: VisitSessionRecord | null = null;
  const useCase = new RecordVisitSessionUseCase(
    { getVisitHashKey: () => 'visit-hash-key' } as any,
    {
      recordSession: async record => {
        savedRecord = record;
      },
    } as any,
    {
      config: { perMinute: 100, perDay: 100, globalDaily: 100, salt: 'visit-rate-limit' },
      store: { hit: async () => ({ allowed: true }) },
    }
  );

  await useCase.execute({
    clientIp: '203.0.113.10',
    sessionId: 'visitor-session',
    geo: {},
    attribution: {
      referrer: 'https://www.linkedin.com/feed/',
      source: 'linkedin',
      medium: 'social',
      campaign: 'founders-post',
      term: 'ai-assistant',
      content: 'hero-link',
      clickId: 'li_fat_id',
    },
    events: [
      {
        name: 'scroll_depth',
        params: { page_path: '/', percent: 50 },
        sequence: 1,
        timestamp: '2026-08-28T10:00:00.000Z',
        path: '/',
      },
    ],
  });

  assert.ok(savedRecord);
  assert.equal(savedRecord.referrer, 'https://www.linkedin.com/feed/');
  assert.equal(savedRecord.source, 'linkedin');
  assert.equal(savedRecord.medium, 'social');
  assert.equal(savedRecord.campaign, 'founders-post');
  assert.equal(savedRecord.term, 'ai-assistant');
  assert.equal(savedRecord.content, 'hero-link');
  assert.equal(savedRecord.clickId, 'li_fat_id');
});
