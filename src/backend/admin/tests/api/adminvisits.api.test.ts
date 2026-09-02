import assert from 'node:assert/strict';
import test from 'node:test';

import { VisitsController } from '../../apps/api/controllers/visits.controller.js';
import { DeleteVisitSessionUseCase } from '../../application/usecases/visits/deletevisitsession.usecase.js';
import { ListAllVisitSessionsUseCase } from '../../application/usecases/visits/listallvisitsessions.usecase.js';
import { ListVisitCountryBreakdownUseCase } from '../../application/usecases/visits/listvisitcountrybreakdown.usecase.js';
import { ListVisitMetricsUseCase } from '../../application/usecases/visits/listvisitmetrics.usecase.js';
import { ListVisitSessionsUseCase } from '../../application/usecases/visits/listvisitsessions.usecase.js';

class TestVisitsController extends VisitsController {
  constructor(visits) {
    super(visits, createAuthenticateUserUseCase());
  }
}

test('logs visits through the public write-only endpoint after rate limiting', async () => {
  let recordedSessionId = '';
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute(input) {
        recordedSessionId = input.sessionId;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(createVisitLogRequest());

  assert.equal(response.status, 204);
  assert.equal(recordedSessionId, 'visitor-session');
});

test('rate limits visit logs before reading the body', async () => {
  let recordCalled = false;
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute() {
        recordCalled = true;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: false, retryAfterSeconds: 20 }) },
  } as any);
  const response = await controller.log(
    new Request('https://arg.software/api/visit-log', {
      method: 'POST',
      headers: { 'x-nf-client-connection-ip': '203.0.113.10' },
      body: '{',
    })
  );
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '20');
  assert.equal(body.error.code, 'rate_limited');
  assert.equal(recordCalled, false);
});

test('skips known bot visit logs before reading the body', async () => {
  let recordCalled = false;
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute() {
        recordCalled = true;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    new Request('https://arg.software/api/visit-log', {
      method: 'POST',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'x-nf-client-connection-ip': '203.0.113.10',
      },
      body: '{',
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordCalled, false);
});

test('skips low-engagement visit logs with one short page view and no events', async () => {
  let recordCalled = false;
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute() {
        recordCalled = true;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    createVisitLogRequest({
      events: [],
      pageViews: [createVisitPageView(1000)],
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordCalled, false);
});

test('skips low-engagement visit logs with only the automatic page view event', async () => {
  let recordCalled = false;
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute() {
        recordCalled = true;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    createVisitLogRequest({
      events: [{ name: 'page_view', timestamp: '2026-08-28T10:00:00.000Z', path: '/' }],
      pageViews: [createVisitPageView(1000)],
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordCalled, false);
});

test('records short visit logs with attribution', async () => {
  let recordedSessionId = '';
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute(input) {
        recordedSessionId = input.sessionId;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    createVisitLogRequest({
      attribution: { source: 'linkedin', campaign: 'founders-post' },
      events: [],
      pageViews: [createVisitPageView(1000)],
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordedSessionId, 'visitor-session');
});

test('records short visit logs with meaningful events', async () => {
  let recordedSessionId = '';
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute(input) {
        recordedSessionId = input.sessionId;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    createVisitLogRequest({
      events: [{ name: 'cta_click', timestamp: '2026-08-28T10:00:01.000Z', path: '/' }],
      pageViews: [createVisitPageView(1000)],
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordedSessionId, 'visitor-session');
});

test('records longer visit logs without events', async () => {
  let recordedSessionId = '';
  const controller = new TestVisitsController({
    recordVisitSessionUseCase: {
      async execute(input) {
        recordedSessionId = input.sessionId;
      },
    },
    visitLogRateLimiter: { check: async () => ({ allowed: true }) },
  } as any);
  const response = await controller.log(
    createVisitLogRequest({
      events: [],
      pageViews: [createVisitPageView(5000)],
    })
  );

  assert.equal(response.status, 204);
  assert.equal(recordedSessionId, 'visitor-session');
});

test('deletes visit sessions through the authenticated admin endpoint', async () => {
  let deletedSessionHash = '';
  const controller = new TestVisitsController({
    deleteVisitSessionUseCase: new DeleteVisitSessionUseCase({
      async deleteById(sessionHash) {
        deletedSessionHash = sessionHash;
      },
    } as any),
  } as any);
  const response = await controller.delete(
    new Request('https://arg.software/api/admin/visit-session?sessionHash=session-hash', {
      method: 'DELETE',
    })
  );

  assert.equal(response.status, 204);
  assert.equal(deletedSessionHash, 'session-hash');
});

test('routes visit stat metric requests to the narrow stat query', async () => {
  let receivedMetric = '';
  let receivedRange = '';
  const controller = new TestVisitsController({
    listVisitMetricsUseCase: {
      async execute(input: any) {
        receivedMetric = input.metric;
        receivedRange = input.range;
        return { metric: input.metric, range: input.range, value: 12 };
      },
    },
  } as any);
  const response = await controller.metrics(
    new Request('https://arg.software/api/admin/visit-metrics?metric=page_views&range=today')
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedMetric, 'page_views');
  assert.equal(receivedRange, 'today');
  assert.deepEqual(body, { metric: 'page_views', range: 'today', value: 12 });
});

test('routes visit chart requests with a selected series', async () => {
  let receivedSeries = '';
  const controller = new TestVisitsController({
    listVisitMetricsUseCase: {
      async execute(input: any) {
        receivedSeries = input.series;
        return { range: input.range, series: input.series, points: [] };
      },
    },
  } as any);
  const response = await controller.metrics(
    new Request(
      'https://arg.software/api/admin/visit-metrics?metric=chart&range=this_month&series=events'
    )
  );

  assert.equal(response.status, 200);
  assert.equal(receivedSeries, 'events');
});

test('routes generic visit breakdown requests independently', async () => {
  let receivedMetric = '';
  let receivedPage = 0;
  let receivedPageSize = 0;
  const controller = new TestVisitsController({
    listVisitMetricsUseCase: {
      async execute(input: any) {
        receivedMetric = input.metric;
        receivedPage = input.page;
        receivedPageSize = input.pageSize;
        return {
          metric: input.metric,
          range: input.range,
          records: [{ label: 'direct', value: 3 }],
        };
      },
    },
  } as any);
  const response = await controller.metrics(
    new Request(
      'https://arg.software/api/admin/visit-metrics?metric=sources&range=last_week&page=2&pageSize=10'
    )
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedMetric, 'sources');
  assert.equal(receivedPage, '2');
  assert.equal(receivedPageSize, '10');
  assert.deepEqual(body.records, [{ label: 'direct', value: 3 }]);
});

test('keeps country count on the visit metrics stat route', async () => {
  let receivedSessionHashes: string[] = [];
  const useCase = new ListVisitMetricsUseCase(
    {
      async findMetricsByHashes(sessionHashes) {
        receivedSessionHashes = sessionHashes;
        return [
          createMetricSession('session-a', 'PT'),
          createMetricSession('session-b', 'US'),
        ];
      },
    },
    {
      async findForMetricRange() {
        return [createMetricPageView('session-a'), createMetricPageView('session-b')];
      },
    },
    { async findForMetricRange() { return []; } } as any
  );

  const result = await useCase.execute({ metric: 'countries', range: 'today' });

  assert.deepEqual(receivedSessionHashes, ['session-a', 'session-b']);
  assert.deepEqual(result, { metric: 'countries', range: 'today', value: 2 });
});

test('routes country breakdown through the dedicated endpoint', async () => {
  let receivedRange = '';
  let receivedPage = '';
  let receivedPageSize = '';
  const controller = new TestVisitsController({
    listVisitCountryBreakdownUseCase: {
      async execute(input: any) {
        receivedRange = input.range;
        receivedPage = input.page;
        receivedPageSize = input.pageSize;
        return {
          metric: 'countries',
          range: input.range,
          records: [{ label: 'PT', value: 3 }],
          pagination: { page: 2, pageSize: 10, totalRecords: 1, totalPages: 1 },
        };
      },
    },
  } as any);
  const response = await controller.countryBreakdown(
    new Request(
      'https://arg.software/api/admin/visit-country-breakdown?range=last_week&page=2&pageSize=10'
    )
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedRange, 'last_week');
  assert.equal(receivedPage, '2');
  assert.equal(receivedPageSize, '10');
  assert.deepEqual(body.records, [{ label: 'PT', value: 3 }]);
});

test('paginates country breakdown in the use case', async () => {
  const useCase = new ListVisitCountryBreakdownUseCase(
    {
      async findMetricsByHashes() {
        return [
          createMetricSession('session-a', 'PT'),
          createMetricSession('session-b', 'US'),
          createMetricSession('session-c', 'BR'),
        ];
      },
    },
    {
      async findForMetricRange() {
        return [
          createMetricPageView('session-a'),
          createMetricPageView('session-b'),
          createMetricPageView('session-c'),
        ];
      },
    }
  );

  const result = await useCase.execute({ range: 'today', page: '2', pageSize: '2' });

  assert.equal(result.metric, 'countries');
  assert.deepEqual(result.records, [{ id: 'US', label: 'US', value: 1 }]);
  assert.deepEqual(result.pagination, { page: 2, pageSize: 2, totalRecords: 3, totalPages: 2 });
});

test('paginates visit breakdown in the use case', async () => {
  const useCase = new ListVisitMetricsUseCase(
    {
      async findMetricsByHashes() {
        return [
          { ...createMetricSession('session-a', 'PT'), source: 'google' },
          { ...createMetricSession('session-b', 'US'), source: 'linkedin' },
          { ...createMetricSession('session-c', 'BR'), source: 'github' },
        ];
      },
    },
    {
      async findForMetricRange() {
        return [
          createMetricPageView('session-a'),
          createMetricPageView('session-b'),
          createMetricPageView('session-c'),
        ];
      },
    },
    { async findForMetricRange() { return []; } } as any
  );

  const result = await useCase.execute({ metric: 'sources', page: '2', pageSize: '2' });

  assert.equal(result.metric, 'sources');
  assert.deepEqual(result.records, [{ id: 'linkedin', label: 'linkedin', value: 1 }]);
  assert.deepEqual(result.pagination, { page: 2, pageSize: 2, totalRecords: 3, totalPages: 2 });
});

test('sorts page breakdown in the use case', async () => {
  const useCase = new ListVisitMetricsUseCase(
    { async findMetricsByHashes() { return []; } } as any,
    {
      async findForMetricRange() {
        return [
          createMetricPageView('session-a', '/slow', 400),
          createMetricPageView('session-b', '/fast', 100),
        ];
      },
    },
    { async findForMetricRange() { return []; } } as any
  );

  const result = await useCase.execute({ metric: 'pages', sortBy: 'averageDurationMs', sortDirection: 'asc' });

  assert.deepEqual(result.records.map(record => record.path), ['/fast', '/slow']);
});

test('routes all visit sessions through the dedicated endpoint', async () => {
  let receivedPage = '';
  let receivedSortBy = '';
  const controller = new TestVisitsController({
    listAllVisitSessionsUseCase: new ListAllVisitSessionsUseCase({
      async findMany(input) {
        receivedPage = String(input?.page || '');
        receivedSortBy = String(input?.sortBy || '');
        return {
          records: [],
          totalRecords: 0,
        };
      },
    } as any),
  } as any);
  const response = await controller.allSessions(
    new Request(
      'https://arg.software/api/admin/all-visit-sessions?page=2&pageSize=10&sortBy=durationMs&sortDirection=asc'
    )
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedPage, '2');
  assert.equal(receivedSortBy, 'durationMs');
  assert.equal(body.pagination.page, 2);
});

test('passes recent visit session sorting to the repository', async () => {
  let receivedSortBy = '';
  let receivedSortDirection = '';
  const useCase = new ListVisitSessionsUseCase({
    async findMany(input) {
      receivedSortBy = String(input?.sortBy || '');
      receivedSortDirection = String(input?.sortDirection || '');
      return {
        records: [],
        totalRecords: 0,
      };
    },
  } as any);

  await useCase.execute({ sortBy: 'entryPath', sortDirection: 'asc' });

  assert.equal(receivedSortBy, 'entryPath');
  assert.equal(receivedSortDirection, 'asc');
});

test('defaults invalid visit session sorting to latest activity first', async () => {
  let receivedSortBy = '';
  let receivedSortDirection = '';
  const useCase = new ListAllVisitSessionsUseCase({
    async findMany(input) {
      receivedSortBy = String(input?.sortBy || '');
      receivedSortDirection = String(input?.sortDirection || '');
      return {
        records: [],
        totalRecords: 0,
      };
    },
  } as any);

  await useCase.execute({ sortBy: 'unknown', sortDirection: 'sideways' });

  assert.equal(receivedSortBy, 'lastSeenAt');
  assert.equal(receivedSortDirection, 'desc');
});

test('defaults visit metric requests to today', async () => {
  const useCase = new ListVisitMetricsUseCase(
    { async findMetricsByHashes() { return []; } } as any,
    { async findForMetricRange() { return []; } },
    { async findForMetricRange() { return []; } }
  );

  const result = await useCase.execute({ metric: 'chart' });

  assert.equal(result.range, 'today');
});

function createMetricPageView(sessionHash: string, path = '/', durationMs = 100) {
  return {
    sessionHash,
    path,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.000Z',
    durationMs,
  };
}

function createMetricSession(sessionHash: string, countryCode: string) {
  return {
    sessionHash,
    countryCode,
    referrer: null,
    source: null,
    campaign: null,
    clickId: null,
  };
}

function createVisitLogRequest(payload = {}) {
  return new Request('https://arg.software/api/visit-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nf-client-connection-ip': '203.0.113.10',
    },
    body: JSON.stringify({
      sessionId: 'visitor-session',
      events: [],
      pageViews: [],
      language: 'en',
      ...payload,
    }),
  });
}

function createVisitPageView(durationMs: number) {
  return {
    path: '/',
    title: 'ARG Software',
    sequence: 1,
    startedAt: '2026-08-28T10:00:00.000Z',
    endedAt: '2026-08-28T10:00:01.000Z',
    durationMs,
  };
}

function createAuthenticateUserUseCase() {
  return { execute: async () => ({ email: 'admin@arg.software' }) } as any;
}
