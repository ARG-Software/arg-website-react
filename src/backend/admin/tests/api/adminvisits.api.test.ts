import assert from 'node:assert/strict';
import test from 'node:test';

import { VisitsController } from '../../apps/api/controllers/visits.controller.js';
import { DeleteVisitSessionUseCase } from '../../application/usecases/visits/deletevisitsession.usecase.js';
import { ListAllVisitSessionsUseCase } from '../../application/usecases/visits/listallvisitsessions.usecase.js';
import { ListVisitCountryBreakdownUseCase } from '../../application/usecases/visits/listvisitcountrybreakdown.usecase.js';
import { ListVisitMetricsUseCase } from '../../application/usecases/visits/listvisitmetrics.usecase.js';

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
  let receivedMetric = '';
  const useCase = new ListVisitMetricsUseCase({
    async getStat(metric) {
      receivedMetric = metric;
      return { metric, range: 'today', value: 2 };
    },
  } as any);

  const result = await useCase.execute({ metric: 'countries', range: 'today' });

  assert.equal(receivedMetric, 'countries');
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

test('passes country breakdown pagination to the repository', async () => {
  let receivedMetric = '';
  let receivedPage = 0;
  let receivedPageSize = 0;
  const useCase = new ListVisitCountryBreakdownUseCase({
    async getBreakdown(metric, _range, pagination) {
      receivedMetric = metric;
      receivedPage = pagination.page;
      receivedPageSize = pagination.pageSize;
      return {
        metric,
        range: 'today',
        records: [{ label: 'PT', value: 3 }],
        pagination: {
          page: receivedPage,
          pageSize: receivedPageSize,
          totalRecords: 1,
          totalPages: 1,
        },
      };
    },
  } as any);

  const result = await useCase.execute({ range: 'today', page: '2', pageSize: '20' });

  assert.equal(receivedMetric, 'countries');
  assert.equal(receivedPage, 2);
  assert.equal(receivedPageSize, 20);
  assert.deepEqual(result.records, [{ label: 'PT', value: 3 }]);
});

test('passes visit breakdown pagination to the repository', async () => {
  let receivedPage = 0;
  let receivedPageSize = 0;
  const useCase = new ListVisitMetricsUseCase({
    async getBreakdown(_metric, _range, pagination) {
      receivedPage = pagination.page;
      receivedPageSize = pagination.pageSize;
      return {
        metric: 'sources',
        range: 'today',
        records: [],
        pagination: {
          page: receivedPage,
          pageSize: receivedPageSize,
          totalRecords: 0,
          totalPages: 1,
        },
      };
    },
  } as any);

  await useCase.execute({ metric: 'sources', page: '3', pageSize: '12' });

  assert.equal(receivedPage, 3);
  assert.equal(receivedPageSize, 12);
});

test('routes all visit sessions through the dedicated endpoint', async () => {
  let receivedPage = '';
  const controller = new TestVisitsController({
    listAllVisitSessionsUseCase: new ListAllVisitSessionsUseCase({
      async listAllSessions(input) {
        receivedPage = String(input?.page || '');
        return {
          records: [],
          pagination: {
            page: input?.page || 1,
            pageSize: input?.pageSize || 10,
            totalRecords: 0,
            totalPages: 1,
          },
        };
      },
    } as any),
  } as any);
  const response = await controller.allSessions(
    new Request('https://arg.software/api/admin/all-visit-sessions?page=2&pageSize=10')
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedPage, '2');
  assert.equal(body.pagination.page, 2);
});

test('defaults visit metric requests to today', async () => {
  let receivedRange = '';
  const useCase = new ListVisitMetricsUseCase({
    async getChart(range) {
      receivedRange = range;
      return { range, series: 'all', points: [] };
    },
  } as any);

  await useCase.execute({ metric: 'chart' });

  assert.equal(receivedRange, 'today');
});

function createVisitLogRequest() {
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
    }),
  });
}

function createAuthenticateUserUseCase() {
  return { execute: async () => ({ email: 'admin@arg.software' }) } as any;
}
