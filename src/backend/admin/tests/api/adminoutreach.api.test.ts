import assert from 'node:assert/strict';
import test from 'node:test';

import { OutreachController } from '../../apps/api/controllers/outreach.controller.js';
import { ACCESS_COOKIE_NAME } from '../../apps/http/usersession.cookies.js';
import { CreateOutreachCsvUseCase } from '../../application/usecases/outreach/createoutreachcsv.usecase.js';
import { GetOutreachChartUseCase } from '../../application/usecases/outreach/getoutreachchart.usecase.js';
import { GetOutreachRecordUseCase } from '../../application/usecases/outreach/getoutreachrecord.usecase.js';
import { GetOutreachSummaryUseCase } from '../../application/usecases/outreach/getoutreachsummary.usecase.js';
import { ImportOutreachCsvUseCase } from '../../application/usecases/outreach/importoutreachcsv.usecase.js';
import { ListOutreachRecordsUseCase } from '../../application/usecases/outreach/listoutreachrecords.usecase.js';
import { UpdateOutreachRecordUseCase } from '../../application/usecases/outreach/updateoutreachrecord.usecase.js';
import { Outreach } from '../../domain/outreach.js';
import { OutreachCsvParser } from '../../infrastructure/csv/outreachcsv.parser.js';

class TestOutreachController extends OutreachController {
  constructor(outreachUseCases) {
    super(outreachUseCases, createAuthenticateUserUseCase());
  }
}

test('paginates outreach records from the split records endpoint', async () => {
  const api = createTestApi(createRecords(25));
  const response = await api(createGetRequest('/api/admin/outreach-records?page=2&pageSize=10&sortBy=dateSent'));
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
    createRecord(2, { status: 'sent', dateSent: '2026-08-12' }),
    createRecord(3, { status: 'sent', dateSent: '2026-08-13', replyObtained: true }),
  ]);
  const response = await api(createGetRequest('/api/admin/outreach-records?status=sent&pageSize=10'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.status),
    ['sent', 'sent']
  );
});

test('filters outreach records by company name', async () => {
  const api = createTestApi([
    createRecord(1, { companyName: 'ARG Software' }),
    createRecord(2, { companyName: 'Acme Finance' }),
    createRecord(3, { companyName: 'Media Alpha' }),
  ]);
  const response = await api(createGetRequest('/api/admin/outreach-records?companyName=arg&pageSize=10'));
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.companyName),
    ['ARG Software']
  );
  assert.equal(body.pagination.totalRecords, 1);
});

test('filters outreach records by sent date range', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'sent', dateSent: '2026-08-10' }),
    createRecord(2, { status: 'sent', dateSent: '2026-08-12' }),
    createRecord(3, { status: 'sent', dateSent: '2026-08-15' }),
    createRecord(4, { status: 'not_sent', dateSent: '' }),
  ]);
  const response = await api(
    createGetRequest('/api/admin/outreach-records?dateSentFrom=2026-08-11&dateSentTo=2026-08-14&pageSize=10')
  );
  const body = await response.json();

  assert.deepEqual(
    body.records.map(record => record.dateSent),
    ['2026-08-12']
  );
  assert.equal(body.pagination.totalRecords, 1);
});

test('rejects removed contact email sorting', async () => {
  const api = createTestApi(createRecords(1));
  const response = await api(createGetRequest('/api/admin/outreach-records?sortBy=contactEmail'));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_sort');
});

test('caps dashboard recent sent records to the latest 30', async () => {
  const api = createTestApi([
    ...Array.from({ length: 31 }, (_, index) =>
      createRecord(index + 1, {
        status: 'sent',
        dateSent: `2026-08-${String(index + 1).padStart(2, '0')}`,
      })
    ),
    createRecord(32, { status: 'sent', dateSent: '2026-01-01', companyName: 'Aged Alpha' }),
  ]);
  const response = await api(
    createGetRequest('/api/admin/outreach-records?scope=recent_sent&sortBy=companyName&sortDirection=asc&pageSize=30')
  );
  const body = await response.json();

  assert.equal(body.pagination.totalRecords, 30);
  assert.equal(
    body.records.some(record => record.companyName === 'Aged Alpha'),
    false
  );
});

test('returns outreach summary counts from the summary endpoint', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'not_sent' }),
    createRecord(2, { status: 'sent', replyObtained: false }),
    createRecord(3, { status: 'sent', replyObtained: true }),
  ]);
  const response = await api(createGetRequest('/api/admin/outreach-summary'));
  const body = await response.json();

  assert.deepEqual(body.summary, {
    total: 3,
    sent: 2,
    notSent: 1,
    repliesObtained: 1,
    sentWithoutReply: 1,
  });
});

test('returns one full outreach record from the detail endpoint', async () => {
  const api = createTestApi([
    createRecord(1, {
      companyName: 'ARG Software',
      emailSubject: 'Hello ARG',
      emailBody: 'Full email draft',
      notes: 'Private note',
    }),
  ]);
  const response = await api(createGetRequest('/api/admin/outreach-record?id=record-1'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.record.companyName, 'ARG Software');
  assert.equal(body.record.emailSubject, 'Hello ARG');
  assert.equal(body.record.emailBody, 'Full email draft');
  assert.equal(body.record.notes, 'Private note');
});

test('records endpoint uses the paginated repository method', async () => {
  const api = createTestApi(createRecords(1), {
    list: async () => {
      throw new Error('full list should only be used for export');
    },
  });
  const response = await api(createGetRequest('/api/admin/outreach-records?pageSize=10'));

  assert.equal(response.status, 200);
});

test('returns outreach chart data from the chart endpoint', async () => {
  const api = createTestApi([
    createRecord(1, { status: 'sent', dateSent: '2026-08-13' }),
    createRecord(2, { status: 'sent', dateSent: '2026-08-13' }),
    createRecord(3, { status: 'sent', dateSent: '2026-08-14', replyObtained: true }),
    createRecord(4, { status: 'not_sent' }),
  ]);
  const response = await api(createGetRequest('/api/admin/outreach-chart?range=7d'));
  const body = await response.json();

  assert.equal(body.range, '7d');
  assert.deepEqual(body.points.at(-2), { label: '2026-08-13', sent: 2, repliesObtained: 0 });
  assert.deepEqual(body.points.at(-1), { label: '2026-08-14', sent: 1, repliesObtained: 1 });
  assert.deepEqual(body.pie, [
    { label: 'Replies obtained', value: 1 },
    { label: 'Sent without reply', value: 2 },
  ]);
});

test('exports all outreach records as CSV from the export endpoint', async () => {
  const api = createTestApi([createRecord(1, { companyName: 'CSV Co' })]);
  const response = await api(createGetRequest('/api/admin/outreach-export'));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  assert.match(body, /^companyName,website,contactEmail/);
  assert.match(body, /CSV Co/);
});

test('imports CSV records from the import endpoint', async () => {
  const created = [];
  const api = createTestApi([], {
    createMany(records) {
      created.push(...records);
      return records.map((record, index) => new Outreach({ ...record, id: `record-${index + 1}` }));
    },
  });
  const csv = 'companyName,contactEmail,contactMethod,status\nAcme,a@example.com,email,not_sent';
  const response = await api(createPostRequest('/api/admin/outreach-import', { csv }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.imported, 1);
  assert.equal(created[0].companyName, 'Acme');
  assert.equal(created[0].status, 'not_sent');
});

test('imports CSV email drafts without collapsing paragraphs', async () => {
  const created = [];
  const api = createTestApi([], {
    createMany(records) {
      created.push(...records);
      return records.map((record, index) => new Outreach({ ...record, id: `record-${index + 1}` }));
    },
  });
  const csv = [
    'companyName,emailSubject,emailBody,status',
    'Acme," Hello\nthere ","First line  /n/nSecond line\\nThird line   ",not_sent',
  ].join('\n');
  const response = await api(createPostRequest('/api/admin/outreach-import', { csv }));

  assert.equal(response.status, 200);
  assert.equal(created[0].emailSubject, 'Hello there');
  assert.equal(created[0].emailBody, 'First line\n\nSecond line\nThird line');
});

test('rejects status changes for already sent outreach records', async () => {
  const record = createRecord(1, { status: 'sent', dateSent: '2026-08-14' });
  const api = createTestApi([], {
    findById: () => new Outreach(record),
    save: () => {
      throw new Error('save should not be called');
    },
  });
  const response = await api(createUpdateRequest(record, { status: 'not_sent' }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'sent_status_locked');
});

test('allows sent outreach records to save unchanged status with other edits', async () => {
  const record = createRecord(1, { status: 'sent', dateSent: '2026-08-14' });
  const api = createTestApi([], {
    findById: () => new Outreach(record),
    save: nextRecord => nextRecord,
  });
  const response = await api(createUpdateRequest(record, { status: 'sent', notes: 'Updated notes' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.record.status, 'sent');
  assert.equal(body.record.notes, 'Updated notes');
});

function createTestApi(records, repositoryOverrides = {}) {
  const storedRecords = records.map(record => new Outreach(record));
  const csvParser = new OutreachCsvParser();
  const outreachRepository = {
    list: async () => storedRecords,
    listRecords: async query => listRecords(storedRecords, query),
    getSummary: async () => createSummary(storedRecords),
    listChartRecords: async ({ dateSentFrom = '' } = {}) =>
      storedRecords
        .filter(record => record.status === 'sent')
        .filter(record => !dateSentFrom || record.dateSent >= dateSentFrom)
        .map(record => ({
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          dateSent: record.dateSent,
          replyObtained: record.replyObtained,
        })),
    findById: async id => storedRecords.find(record => record.id === id) || null,
    save: async record => record,
    createMany: async records => records.map((record, index) => new Outreach({ ...record, id: `record-${index + 1}` })),
    ...repositoryOverrides,
  };
  const controller = new TestOutreachController({
    createOutreachCsvUseCase: new CreateOutreachCsvUseCase(csvParser, outreachRepository as any),
    getOutreachChartUseCase: new GetOutreachChartUseCase(
      outreachRepository as any,
      { today: () => '2026-08-14' }
    ),
    getOutreachRecordUseCase: new GetOutreachRecordUseCase(outreachRepository as any),
    getOutreachSummaryUseCase: new GetOutreachSummaryUseCase(outreachRepository as any),
    importOutreachCsvUseCase: new ImportOutreachCsvUseCase(
      { today: () => '2026-08-14' },
      csvParser,
      outreachRepository as any
    ),
    listOutreachRecordsUseCase: new ListOutreachRecordsUseCase(outreachRepository as any),
    updateOutreachRecordUseCase: new UpdateOutreachRecordUseCase(
      { recordUpdated: async () => {} },
      outreachRepository as any
    ),
  } as any);

  return async function api(request) {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/api/admin/outreach-records') return controller.records(request);
    if (request.method === 'GET' && pathname === '/api/admin/outreach-summary') return controller.summary(request);
    if (request.method === 'GET' && pathname === '/api/admin/outreach-chart') return controller.chart(request);
    if (request.method === 'GET' && pathname === '/api/admin/outreach-record') return controller.record(request);
    if (request.method === 'GET' && pathname === '/api/admin/outreach-export') return controller.exportCsv(request);
    if (request.method === 'POST' && pathname === '/api/admin/outreach-import') return controller.importCsv(request);
    if (request.method === 'PATCH' && pathname === '/api/admin/outreach-record') return controller.update(request);

    return new Response(null, { status: 404 });
  };
}

function listRecords(records, query) {
  let result = records
    .filter(record => !query.status || record.status === query.status)
    .filter(record => !query.companyName || record.companyName.toLowerCase().includes(query.companyName))
    .filter(record => !query.dateSentFrom || record.dateSent >= query.dateSentFrom)
    .filter(record => !query.dateSentTo || record.dateSent <= query.dateSentTo);

  if (query.recentSent) {
    result = sortRecords(result, { sortBy: 'dateSent', sortDirection: 'desc' }).slice(0, 30);
  }

  result = sortRecords(result, query);

  const start = (query.page - 1) * query.pageSize;

  return {
    records: result.slice(start, start + query.pageSize),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalRecords: result.length,
      totalPages: Math.max(1, Math.ceil(result.length / query.pageSize)),
    },
  };
}

function createSummary(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;

      if (record.status === 'sent') {
        summary.sent += 1;
        if (record.replyObtained) {
          summary.repliesObtained += 1;
        } else {
          summary.sentWithoutReply += 1;
        }
      } else {
        summary.notSent += 1;
      }

      return summary;
    },
    { total: 0, sent: 0, notSent: 0, repliesObtained: 0, sentWithoutReply: 0 }
  );
}

function sortRecords(records, query) {
  const direction = query.sortDirection === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    const comparison = compareValues(getSortValue(first, query.sortBy), getSortValue(second, query.sortBy));

    return comparison * direction;
  });
}

function getSortValue(record, field) {
  if (field === 'createdAt') return Date.parse(record.createdAt || '') || 0;
  if (field === 'dateSent') return Date.parse(record.dateSent || '') || 0;
  if (field === 'followUpDate') return Date.parse(record.followUpDate || '') || 0;

  return String(record.companyName || '').toLowerCase();
}

function compareValues(first, second) {
  if (typeof first === 'number' && typeof second === 'number') return first - second;

  return String(first).localeCompare(String(second), undefined, { sensitivity: 'base' });
}

function createAuthenticateUserUseCase() {
  return { execute: async () => ({ email: 'admin@arg.software' }) } as any;
}

function createGetRequest(path) {
  return new Request(`https://arg.software${path}`, {
    headers: {
      Origin: 'https://arg.software',
      Cookie: `${ACCESS_COOKIE_NAME}=token`,
    },
  });
}

function createPostRequest(path, body) {
  return new Request(`https://arg.software${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
      Cookie: `${ACCESS_COOKIE_NAME}=token`,
    },
    body: JSON.stringify(body),
  });
}

function createUpdateRequest(record, changes) {
  return new Request('https://arg.software/api/admin/outreach-record', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
      Cookie: `${ACCESS_COOKIE_NAME}=token`,
    },
    body: JSON.stringify({ id: record.id, record: { ...record, ...changes } }),
  });
}

function createRecords(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => createRecord(index + 1, overrides));
}

function createRecord(number, overrides = {}) {
  const date = new Date(Date.UTC(2026, 7, 30));
  date.setUTCDate(date.getUTCDate() - number);
  const timestamp = date.toISOString();

  const record = {
    id: `record-${number}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    companyName: `Company ${number}`,
    website: '',
    contactEmail: `company-${number}@example.com`,
    contactInfo: '',
    contactMethod: 'email',
    fitReason: '',
    emailSubject: '',
    emailBody: '',
    status: 'not_sent',
    dateSent: '',
    followUpDate: '',
    replyObtained: false,
    replySummary: '',
    notes: '',
    ...overrides,
  };

  if (record.status === 'sent' && !record.dateSent) {
    record.dateSent = timestamp.slice(0, 10);
  }

  return record;
}
