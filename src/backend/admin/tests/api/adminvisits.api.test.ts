import assert from 'node:assert/strict';
import test from 'node:test';

import { VisitsController } from '../../apps/api/controllers/visits.controller.js';
import { DeleteVisitSessionUseCase } from '../../application/usecases/visits/deletevisitsession.usecase.js';

class TestVisitsController extends VisitsController {
  protected override authenticateUser(): Promise<any> {
    return Promise.resolve({ email: 'admin@arg.software' });
  }
}

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

test('routes visit breakdown requests independently', async () => {
  let receivedMetric = '';
  const controller = new TestVisitsController({
    listVisitMetricsUseCase: {
      async execute(input: any) {
        receivedMetric = input.metric;
        return { metric: input.metric, range: input.range, records: [{ label: 'PT', value: 3 }] };
      },
    },
  } as any);
  const response = await controller.metrics(
    new Request('https://arg.software/api/admin/visit-metrics?metric=countries&range=last_week')
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedMetric, 'countries');
  assert.deepEqual(body.records, [{ label: 'PT', value: 3 }]);
});
