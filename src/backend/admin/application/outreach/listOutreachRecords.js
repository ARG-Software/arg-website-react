import { OUTREACH_STATUS_VALUES } from '../../domain/outreachRecord.js';
import { createAdminError } from '../errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RECENT_SENT_LIMIT = 30;
const NOT_SENT_STATUSES = new Set(['draft', 'ready']);

export async function listOutreachRecords(query = {}, { outreachRepository, clock } = {}) {
  const records = await outreachRepository.list();
  const scope = query.scope || 'list';

  if (scope === 'summary') {
    return { summary: createSummary(records) };
  }

  if (scope === 'chart') {
    return createChartResponse(records, query.range || 'all', clock);
  }

  const pagination = getPagination(query);
  const filteredRecords = filterRecords(records, query, scope);
  const sortedRecords = sortRecords(filteredRecords, scope);
  const limitedRecords =
    scope === 'recent_sent' ? sortedRecords.slice(0, RECENT_SENT_LIMIT) : sortedRecords;

  return {
    records: getPageRecords(limitedRecords, pagination),
    pagination: createPagination(limitedRecords.length, pagination),
  };
}

function createSummary(records) {
  return records.reduce(
    (summary, record) => {
      const status = record.payload?.status || 'draft';
      summary.total += 1;
      if (status === 'ready') summary.ready += 1;
      if (status === 'sent') summary.sent += 1;
      if (status === 'replied') summary.replied += 1;
      if (NOT_SENT_STATUSES.has(status)) summary.notSent += 1;
      return summary;
    },
    { total: 0, ready: 0, sent: 0, replied: 0, notSent: 0 }
  );
}

function filterRecords(records, query, scope) {
  const statuses = getRequestedStatuses(query, scope);

  if (!statuses.length) {
    return records;
  }

  return records.filter(record => statuses.includes(record.payload?.status || 'draft'));
}

function getRequestedStatuses(query, scope) {
  if (scope === 'recent_sent') {
    return ['sent'];
  }

  const statuses = query.statuses
    ? query.statuses
        .split(',')
        .map(status => status.trim())
        .filter(Boolean)
    : query.status
      ? [query.status]
      : [];

  for (const status of statuses) {
    if (!OUTREACH_STATUS_VALUES.has(status)) {
      throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
    }
  }

  return statuses;
}

function sortRecords(records, scope) {
  const sortByRecentSent =
    scope === 'recent_sent' || records.every(record => record.payload?.status === 'sent');

  return [...records].sort((first, second) => {
    if (sortByRecentSent) {
      return compareDescending(getSentTimestamp(first), getSentTimestamp(second));
    }

    return compareDescending(Date.parse(first.createdAt || ''), Date.parse(second.createdAt || ''));
  });
}

function getSentTimestamp(record) {
  return Date.parse(record.payload?.date_sent || record.updatedAt || record.createdAt || '') || 0;
}

function compareDescending(first, second) {
  return (second || 0) - (first || 0);
}

function getPagination(query) {
  return {
    page: clampNumber(query.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(query.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getPageRecords(records, { page, pageSize }) {
  const start = (page - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function createPagination(totalRecords, { page, pageSize }) {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}

function createChartResponse(records, range, clock) {
  const now = getClockDate(clock);
  const buckets = createBuckets(range, now, records);

  for (const record of records) {
    const status = record.payload?.status;
    if (status !== 'sent' && status !== 'replied') continue;

    const date = parseRecordDate(record);
    const key = getBucketKey(date, buckets.granularity);
    const bucket = buckets.items.get(key);
    if (!bucket) continue;

    bucket[status] += 1;
  }

  return {
    range,
    points: [...buckets.items.values()],
  };
}

function getClockDate(clock) {
  return clock?.today ? new Date(`${clock.today()}T00:00:00.000Z`) : new Date();
}

function parseRecordDate(record) {
  return new Date(record.payload?.date_sent || record.updatedAt || record.createdAt || '');
}

function createBuckets(range, now, records) {
  if (range === '7d') {
    return createDailyBuckets(now, 7);
  }

  if (range === '30d') {
    return createDailyBuckets(now, 30);
  }

  if (range === 'monthly') {
    return createMonthlyBuckets(now, 12);
  }

  return createAllTimeBuckets(records);
}

function createDailyBuckets(now, days) {
  const items = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = getBucketKey(date, 'day');
    items.set(key, { label: key, sent: 0, replied: 0 });
  }

  return { granularity: 'day', items };
}

function createMonthlyBuckets(now, months) {
  const items = new Map();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = getBucketKey(date, 'month');
    items.set(key, { label: key, sent: 0, replied: 0 });
  }

  return { granularity: 'month', items };
}

function createAllTimeBuckets(records) {
  const keys = records
    .filter(record => record.payload?.status === 'sent' || record.payload?.status === 'replied')
    .map(record => getBucketKey(parseRecordDate(record), 'month'))
    .filter(Boolean)
    .sort();
  const uniqueKeys = keys.length ? [...new Set(keys)] : [getBucketKey(new Date(), 'month')];
  const items = new Map(uniqueKeys.map(key => [key, { label: key, sent: 0, replied: 0 }]));

  return { granularity: 'month', items };
}

function getBucketKey(date, granularity) {
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  if (granularity === 'month') {
    return `${year}-${month}`;
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
