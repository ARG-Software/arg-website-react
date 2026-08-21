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
  const response = await api(createGetRequest('?page=2&pageSize=10&sortBy=date_sent'));
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
    createRecord(1, { status: 'not_sent' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-12' }),
    createRecord(3, { status: 'sent', date_sent: '2026-08-13', reply_obtained: true }),
  ]);
  const response = await api(createGetRequest('?status=sent&pageSize=10'));
  const body = await response.json();

  assert.equal(body.records.length, 2);
  assert.deepEqual(
    body.records.map(record => record.status),
    ['sent', 'sent']
  );
});

test('filters not-sent outreach records', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'not_sent' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-12' }),
  ]);
  const response = await api(createGetRequest('?status=not_sent&pageSize=10'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.status),
    ['not_sent']
  );
  assert.equal(body.pagination.totalRecords, 1);
});

test('filters outreach records by company name', async () => {
  const api = createTestApi([
    createRecord(1, { company_name: 'ARG Software' }),
    createRecord(2, { company_name: 'Acme Finance' }),
    createRecord(3, { company_name: 'Media Alpha' }),
  ]);
  const response = await api(createGetRequest('?companyName=arg&pageSize=10'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.company_name),
    ['ARG Software']
  );
  assert.equal(body.pagination.totalRecords, 1);
});

test('filters outreach records by sent date range', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'sent', date_sent: '2026-08-10' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-12' }),
    createRecord(3, { status: 'sent', date_sent: '2026-08-15' }),
    createRecord(4, { status: 'not_sent', date_sent: '' }),
  ]);
  const response = await api(
    createGetRequest('?dateSentFrom=2026-08-11&dateSentTo=2026-08-14&pageSize=10')
  );
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.date_sent),
    ['2026-08-12']
  );
  assert.equal(body.pagination.totalRecords, 1);
});

test('sorts company names before pagination', async () => {
  const api = createTestApi([
    createRecord(1, { company_name: 'Zulu' }),
    createRecord(2, { company_name: 'Alpha' }),
    createRecord(3, { company_name: 'Mango' }),
  ]);
  const response = await api(createGetRequest('?sortBy=company_name&sortDirection=asc&pageSize=2'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.company_name),
    ['Alpha', 'Mango']
  );
});

test('sorts follow-up dates before pagination', async () => {
  const api = createTestApi([
    createRecord(1, { follow_up_date: '2026-08-16' }),
    createRecord(2, { follow_up_date: '2026-08-15' }),
    createRecord(3, { follow_up_date: '2026-08-17' }),
  ]);
  const response = await api(
    createGetRequest('?sortBy=follow_up_date&sortDirection=asc&pageSize=2')
  );
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.follow_up_date),
    ['2026-08-15', '2026-08-16']
  );
});

test('rejects removed contact email sorting', async () => {
  const api = createTestApi(createRecords(1));
  const response = await api(createGetRequest('?sortBy=contact_email'));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_sort');
});

test('sorts the latest sent dashboard subset', async () => {
  const api = createTestApi([
    ...Array.from({ length: 31 }, (_, index) =>
      createRecord(index + 1, {
        status: 'sent',
        date_sent: `2026-08-${String(index + 1).padStart(2, '0')}`,
      })
    ),
    createRecord(32, { status: 'sent', date_sent: '2026-01-01', company_name: 'Aged Alpha' }),
  ]);
  const response = await api(
    createGetRequest('?scope=recent_sent&sortBy=company_name&sortDirection=asc&pageSize=30')
  );
  const body = await response.json();

  assert.equal(body.pagination.totalRecords, 30);
  assert.equal(
    body.records.some(record => record.company_name === 'Aged Alpha'),
    false
  );
});

test('caps recent sent outreach records to latest 30', async () => {
  const api = createTestApi(createRecords(36, { status: 'sent', date_sent: '2026-08-14' }));
  const response = await api(createGetRequest('?scope=recent_sent&page=4&pageSize=10'));
  const body = await response.json();

  assert.equal(body.records.length, 0);
  assert.equal(body.pagination.totalRecords, 30);
  assert.equal(body.pagination.totalPages, 3);
});

test('returns outreach summary counts', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'not_sent' }),
    createRecord(2, { status: 'sent', reply_obtained: false }),
    createRecord(3, { status: 'sent', reply_obtained: true }),
  ]);
  const response = await api(createGetRequest('?scope=summary'));
  const body = await response.json();

  assert.deepEqual(body.summary, {
    total: 3,
    sent: 2,
    notSent: 1,
    repliesObtained: 1,
    sentWithoutReply: 1,
  });
});

test('returns outreach chart data and reply pie data', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'sent', date_sent: '2026-08-13' }),
    createRecord(2, { status: 'sent', date_sent: '2026-08-13' }),
    createRecord(3, { status: 'sent', date_sent: '2026-08-14', reply_obtained: true }),
    createRecord(4, { status: 'not_sent' }),
  ]);
  const response = await api(createGetRequest('?scope=chart&range=7d'));
  const body = await response.json();

  assert.equal(body.range, '7d');
  assert.deepEqual(body.points.at(-2), { label: '2026-08-13', sent: 2, repliesObtained: 0 });
  assert.deepEqual(body.points.at(-1), { label: '2026-08-14', sent: 1, repliesObtained: 1 });
  assert.deepEqual(body.pie, [
    { label: 'Replies obtained', value: 1 },
    { label: 'Sent without reply', value: 2 },
  ]);
});

test('exports all outreach records as CSV', async () => {
  const api = createTestApi([createRecord(1, { company_name: 'CSV Co' })]);
  const response = await api(createGetRequest('?scope=export&format=csv'));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  assert.match(body, /^company_name,website,contact_email/);
  assert.match(body, /CSV Co/);
});

test('imports CSV records with server-side row cap and validation', async () => {
  const created = [];
  const api = createTestApi([], {
    createMany(payloads) {
      created.push(...payloads);
      return payloads.map((payload, index) => createRecord(index + 1, payload));
    },
  });
  const csv = 'company_name,contact_email,contact_method,status\nAcme,a@example.com,email,not_sent';
  const response = await api(createPostRequest({ action: 'import', csv }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.imported, 1);
  assert.equal(created[0].company_name, 'Acme');
  assert.equal(created[0].status, 'not_sent');
});

test('rejects status changes for already sent outreach records', async () => {
  const record = createRecord(1, { status: 'sent', date_sent: '2026-08-14' });
  const api = createTestApi([], {
    findById: () => record,
    savePayload: () => {
      throw new Error('savePayload should not be called');
    },
  });
  const response = await api(
    createPostRequest({ id: record.id, changes: { status: 'not_sent' } })
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'sent_status_locked');
});

test('allows sent outreach records to save unchanged status with other edits', async () => {
  const record = createRecord(1, { status: 'sent', date_sent: '2026-08-14' });
  const api = createTestApi([], {
    findById: () => record,
    savePayload: (_id, payload) => ({ ...record, payload }),
  });
  const response = await api(
    createPostRequest({ id: record.id, changes: { status: 'sent', notes: 'Updated notes' } })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.record.status, 'sent');
  assert.equal(body.record.notes, 'Updated notes');
});

function createTestApi(records, repositoryOverrides = {}) {
  return createAdminOutreachApi({
    createDependencies: () => ({
      createOutreachDependencies: () => ({
        adminAccessPolicy: { canAccess: () => true },
        auditRepository: { recordUpdated: () => {} },
        clock: { today: () => '2026-08-14' },
        identityProvider: { getUser: () => ({ email: 'admin@arg.software' }) },
        outreachRepository: {
          list: () => records,
          createMany: () => [],
          ...repositoryOverrides,
        },
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

function createPostRequest(body) {
  return new Request('https://arg.software/api/admin/outreach', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
    },
    body: JSON.stringify(body),
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
    createdAt: timestamp,
    updatedAt: timestamp,
    payload: {
      company_name: `Company ${number}`,
      contact_email: `company-${number}@example.com`,
      contact_method: 'email',
      status: 'not_sent',
      date_sent: '',
      reply_obtained: false,
      ...payload,
    },
  };
}
