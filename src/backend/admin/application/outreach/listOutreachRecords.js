import { OUTREACH_STATUS_VALUES } from '../../domain/outreachRecord.js';
import { createAdminError } from '../errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RECENT_SENT_LIMIT = 30;
const SORTABLE_FIELDS = new Set(['company_name', 'date_sent', 'follow_up_date']);

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

  const sortedRecords =
    scope === 'recent_sent'
      ? sortRecords(getLatestSentRecords(filteredRecords), query, scope)
      : sortRecords(filteredRecords, query, scope);

  if (scope === 'export') {
    return { records: sortedRecords };
  }

  return {
    records: getPageRecords(sortedRecords, pagination),
    pagination: createPagination(sortedRecords.length, pagination),
  };
}

function createSummary(records) {
  return records.reduce(
    (summary, record) => {
      const payload = record.payload || {};
      summary.total += 1;

      if (payload.status === 'sent') {
        summary.sent += 1;
        if (payload.reply_obtained) {
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

function filterRecords(records, query, scope) {
  const status = getRequestedStatus(query, scope);
  const companyName = String(query.companyName || '')
    .trim()
    .toLowerCase();
  const dateRange = getDateSentRange(query);

  return records.filter(record => {
    if (status && record.payload?.status !== status) return false;
    if (companyName && !getCompanySearchText(record).includes(companyName)) return false;
    if (!isDateSentInRange(record, dateRange)) return false;

    return true;
  });
}

function getRequestedStatus(query, scope) {
  if (scope === 'recent_sent') return 'sent';
  if (!query.status) return '';

  const status = String(query.status).trim();

  if (!OUTREACH_STATUS_VALUES.has(status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  return status;
}

function getCompanySearchText(record) {
  return String(record.payload?.company_name || '').toLowerCase();
}

function getDateSentRange(query) {
  return {
    from: getDateFilter(query.dateSentFrom),
    to: getDateFilter(query.dateSentTo),
  };
}

function getDateFilter(value) {
  const date = String(value || '').trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function isDateSentInRange(record, { from, to }) {
  if (!from && !to) return true;

  const dateSent = getDateFilter(record.payload?.date_sent);
  if (!dateSent) return false;
  if (from && dateSent < from) return false;
  if (to && dateSent > to) return false;

  return true;
}

function sortRecords(records, query, scope) {
  const sort = getSort(query, scope);
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    const comparison = compareValues(
      getSortValue(first, sort.field),
      getSortValue(second, sort.field)
    );

    return comparison * direction;
  });
}

function getLatestSentRecords(records) {
  return [...records]
    .sort((first, second) => getSortValue(second, 'date_sent') - getSortValue(first, 'date_sent'))
    .slice(0, RECENT_SENT_LIMIT);
}

function getSort(query, scope) {
  if (scope === 'recent_sent' && !query.sortBy) {
    return { field: 'date_sent', direction: 'desc' };
  }

  const field = String(query.sortBy || 'company_name');
  const defaultDirection = field === 'company_name' ? 'asc' : 'desc';
  const direction =
    String(query.sortDirection || defaultDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!SORTABLE_FIELDS.has(field)) {
    throw createAdminError(400, 'invalid_sort', 'Unsupported sort field');
  }

  return { field, direction };
}

function getSortValue(record, field) {
  if (field === 'date_sent') return Date.parse(record.payload?.date_sent || '') || 0;
  if (field === 'follow_up_date') return Date.parse(record.payload?.follow_up_date || '') || 0;

  return String(record.payload?.[field] || '').toLowerCase();
}

function compareValues(first, second) {
  if (typeof first === 'number' && typeof second === 'number') {
    return first - second;
  }

  return String(first).localeCompare(String(second), undefined, { sensitivity: 'base' });
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
  const sentRecords = records.filter(record => record.payload?.status === 'sent');
  const buckets = createBuckets(range, now, sentRecords);
  const repliesObtained = sentRecords.filter(record => record.payload?.reply_obtained).length;
  const sentWithoutReply = sentRecords.length - repliesObtained;

  for (const record of sentRecords) {
    const date = parseRecordDate(record);
    const key = getBucketKey(date, buckets.granularity);
    const bucket = buckets.items.get(key);
    if (!bucket) continue;

    bucket.sent += 1;
    if (record.payload?.reply_obtained) bucket.repliesObtained += 1;
  }

  return {
    range,
    points: [...buckets.items.values()],
    pie: [
      { label: 'Replies obtained', value: repliesObtained },
      { label: 'Sent without reply', value: sentWithoutReply },
    ],
  };
}

function getClockDate(clock) {
  return clock?.today ? new Date(`${clock.today()}T00:00:00.000Z`) : new Date();
}

function parseRecordDate(record) {
  return new Date(record.payload?.date_sent || record.updatedAt || record.createdAt || '');
}

function createBuckets(range, now, records) {
  if (range === '7d') return createDailyBuckets(now, 7);
  if (range === '30d') return createDailyBuckets(now, 30);
  if (range === 'monthly') return createMonthlyBuckets(now, 12);

  return createAllTimeBuckets(records);
}

function createDailyBuckets(now, days) {
  const items = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = getBucketKey(date, 'day');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'day', items };
}

function createMonthlyBuckets(now, months) {
  const items = new Map();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = getBucketKey(date, 'month');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'month', items };
}

function createAllTimeBuckets(records) {
  const keys = records
    .map(record => getBucketKey(parseRecordDate(record), 'month'))
    .filter(Boolean)
    .sort();
  const uniqueKeys = keys.length ? [...new Set(keys)] : [getBucketKey(new Date(), 'month')];
  const items = new Map(uniqueKeys.map(key => [key, { label: key, sent: 0, repliesObtained: 0 }]));

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
