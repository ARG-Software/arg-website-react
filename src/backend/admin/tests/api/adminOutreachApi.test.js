import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdminOutreachApi,
  createAdminResponse,
  createErrorBody,
  createHttpError,
  getHttpErrorBody,
  getHttpErrorStatus,
} from '../../apps/adminOutreachApi.js';

test('creates admin responses with admin allowed methods', async () => {
  const request = new Request('https://arg.software/api/admin/outreach', {
    headers: { Origin: 'https://arg.software' },
  });
  const response = createAdminResponse(
    request,
    401,
    createErrorBody('unauthenticated', 'Login required')
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
  assert.deepEqual(await response.json(), {
    error: {
      code: 'unauthenticated',
      message: 'Login required',
    },
  });
});

test('maps known admin errors to their HTTP response details', () => {
  const error = createHttpError(403, 'forbidden', 'Admin access denied');

  assert.equal(getHttpErrorStatus(error), 403);
  assert.deepEqual(getHttpErrorBody(error), {
    error: {
      code: 'forbidden',
      message: 'Admin access denied',
    },
  });
});

test('hides unknown admin errors behind a generic response', () => {
  const error = new Error('database exploded');

  assert.equal(getHttpErrorStatus(error), 500);
  assert.deepEqual(getHttpErrorBody(error), {
    error: {
      code: 'admin_request_failed',
      message: 'Admin request failed',
    },
  });
});

test('paginates outreach records from the backend', async () => {
  const api = createTestApi(createRecords(25));
  const response = await api(createGetRequest('?page=2&pageSize=10'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records.length, 10);
  assert.equal(body.records[0].id, 'record-11');
  assert.deepEqual(body.pagination, {
    page: 2,
    pageSize: 10,
    totalRecords: 25,
    totalPages: 3,
  });
});

test('filters sent outreach records', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'draft' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-12' }),
    createRecord(3, { status: 'replied', date_sent: '2026-08-13' }),
  ]);
  const response = await api(createGetRequest('?status=sent&pageSize=10'));
  const body = await response.json();

  assert.equal(body.records.length, 1);
  assert.equal(body.records[0].status, 'sent');
});

test('filters not-sent outreach records with statuses query', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'draft' }),
    createRecord(2, { status: 'ready' }),
    createRecord(3, { status: 'sent' }),
    createRecord(4, { status: 'replied' }),
    createRecord(5, { status: 'follow_up_needed' }),
  ]);
  const response = await api(createGetRequest('?statuses=draft,ready&pageSize=10'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.status),
    ['draft', 'ready']
  );
  assert.equal(body.pagination.totalRecords, 2);
});

test('caps recent sent outreach records to latest 30', async () => {
  const api = createTestApi(createRecords(36, { status: 'sent' }));
  const response = await api(createGetRequest('?scope=recent_sent&page=4&pageSize=10'));
  const body = await response.json();

  assert.equal(body.records.length, 0);
  assert.equal(body.pagination.totalRecords, 30);
  assert.equal(body.pagination.totalPages, 3);
});

test('returns outreach summary counts', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'draft' }),
    createRecord(2, { status: 'ready' }),
    createRecord(3, { status: 'sent' }),
    createRecord(4, { status: 'replied' }),
  ]);
  const response = await api(createGetRequest('?scope=summary'));
  const body = await response.json();

  assert.deepEqual(body.summary, {
    total: 4,
    ready: 1,
    sent: 1,
    replied: 1,
    notSent: 2,
  });
});

test('returns outreach chart data for sent and replied records', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'sent', date_sent: '2026-08-13' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-13' }),
    createRecord(3, { status: 'replied', date_sent: '2026-08-14' }),
    createRecord(4, { status: 'draft', date_sent: '2026-08-14' }),
  ]);
  const response = await api(createGetRequest('?scope=chart&range=7d'));
  const body = await response.json();

  assert.equal(body.range, '7d');
  assert.deepEqual(body.points.at(-2), { label: '2026-08-13', sent: 2, replied: 0 });
  assert.deepEqual(body.points.at(-1), { label: '2026-08-14', sent: 0, replied: 1 });
});

function createTestApi(records) {
  return createAdminOutreachApi({
    createDependencies: () => ({
      createOutreachDependencies: () => ({
        adminAccessPolicy: { canAccess: () => true },
        clock: { today: () => '2026-08-14' },
        identityProvider: { getUser: () => ({ email: 'admin@arg.software' }) },
        outreachRepository: { list: () => records },
      }),
    }),
  });
}

function createGetRequest(query = '') {
  return new Request(`https://arg.software/api/admin/outreach${query}`, {
    headers: {
      Authorization: 'Bearer token',
      Origin: 'https://arg.software',
    },
  });
}

function createRecords(count, payload = {}) {
  return Array.from({ length: count }, (_, index) => createRecord(index + 1, payload));
}

function createRecord(number, payload = {}) {
  const date = new Date(Date.UTC(2026, 7, 30));
  date.setUTCDate(date.getUTCDate() - number);
  const timestamp = date.toISOString();

  return {
    id: `record-${number}`,
    sourceRound: 'round-1',
    sourceRowNumber: number,
    createdAt: timestamp,
    updatedAt: timestamp,
    payload: {
      company_name: `Company ${number}`,
      status: 'draft',
      date_sent: '',
      ...payload,
    },
  };
}
