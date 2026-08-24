import { Outreach } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type { OutreachStatus } from '../../../domain/types/OutreachTypes.js';
import type { IClock } from '../../ports/IClock.js';
import type { IOutreachRepository } from '../../ports/repositories/IOutreachRepository.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RECENT_SENT_LIMIT = 30;
type SortableOutreachField = 'companyName' | 'dateSent' | 'followUpDate';
type OutreachListScope = 'list' | 'summary' | 'chart' | 'recent_sent' | 'export';

interface ListOutreachRecordsQuery {
  scope?: OutreachListScope | string;
  format?: string;
  range?: string;
  page?: string | number;
  pageSize?: string | number;
  status?: string;
  companyName?: string;
  dateSentFrom?: string;
  dateSentTo?: string;
  sortBy?: string;
  sortDirection?: string;
}

interface ListOutreachRecordsDependencies {
  outreachRepository: IOutreachRepository;
  clock: IClock;
}

interface OutreachPagination {
  page: number;
  pageSize: number;
}

interface OutreachChartPoint {
  label: string;
  sent: number;
  repliesObtained: number;
}

const SORTABLE_FIELDS: readonly SortableOutreachField[] = ['companyName', 'dateSent', 'followUpDate'];

export async function listOutreachRecordsUseCase(
  query: ListOutreachRecordsQuery = {},
  { outreachRepository, clock }: ListOutreachRecordsDependencies
) {
  const records = await outreachRepository.list();
  const scope = getScope(query.scope || 'list');

  if (scope === 'summary') {
    return { summary: Outreach.createSummary(records) };
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

function getScope(value: string): OutreachListScope {
  if (value === 'summary' || value === 'chart' || value === 'recent_sent' || value === 'export') {
    return value;
  }

  return 'list';
}

function filterRecords(records: Outreach[], query: ListOutreachRecordsQuery, scope: OutreachListScope): Outreach[] {
  const status = getRequestedStatus(query, scope);
  const companyName = String(query.companyName || '')
    .trim()
    .toLowerCase();
  const dateRange = getDateSentRange(query);

  return records.filter(record => {
    if (status && record.status !== status) return false;
    if (companyName && !getCompanySearchText(record).includes(companyName)) return false;
    if (!isDateSentInRange(record, dateRange)) return false;

    return true;
  });
}

function getRequestedStatus(query: ListOutreachRecordsQuery, scope: OutreachListScope): OutreachStatus | '' {
  if (scope === 'recent_sent') return 'sent';
  if (!query.status) return '';

  const status = String(query.status).trim();

  if (!Outreach.statuses.includes(status as OutreachStatus)) throw OutreachDomainError.invalidStatus();

  return status as OutreachStatus;
}

function getCompanySearchText(record: Outreach): string {
  return String(record.companyName || '').toLowerCase();
}

function getDateSentRange(query: ListOutreachRecordsQuery): { from: string; to: string } {
  return {
    from: getDateFilter(query.dateSentFrom),
    to: getDateFilter(query.dateSentTo),
  };
}

function getDateFilter(value: string | undefined): string {
  const date = String(value || '').trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function isDateSentInRange(record: Outreach, { from, to }: { from: string; to: string }): boolean {
  if (!from && !to) return true;

  const dateSent = getDateFilter(record.dateSent);
  if (!dateSent) return false;
  if (from && dateSent < from) return false;
  if (to && dateSent > to) return false;

  return true;
}

function sortRecords(records: Outreach[], query: ListOutreachRecordsQuery, scope: OutreachListScope): Outreach[] {
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

function getLatestSentRecords(records: Outreach[]): Outreach[] {
  return [...records]
    .sort(
      (first, second) =>
        Number(getSortValue(second, 'dateSent')) - Number(getSortValue(first, 'dateSent'))
    )
    .slice(0, RECENT_SENT_LIMIT);
}

function getSort(query: ListOutreachRecordsQuery, scope: OutreachListScope): { field: SortableOutreachField; direction: 'asc' | 'desc' } {
  if (scope === 'recent_sent' && !query.sortBy) {
    return { field: 'dateSent', direction: 'desc' };
  }

  const field = String(query.sortBy || 'companyName') as SortableOutreachField;
  const defaultDirection = field === 'companyName' ? 'asc' : 'desc';
  const direction =
    String(query.sortDirection || defaultDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!SORTABLE_FIELDS.includes(field)) throw OutreachDomainError.invalidSort();

  return { field, direction };
}

function getSortValue(record: Outreach, field: SortableOutreachField): string | number {
  if (field === 'dateSent') return Date.parse(record.dateSent || '') || 0;
  if (field === 'followUpDate') return Date.parse(record.followUpDate || '') || 0;

  return String(record[field] || '').toLowerCase();
}

function compareValues(first: string | number, second: string | number): number {
  if (typeof first === 'number' && typeof second === 'number') {
    return first - second;
  }

  return String(first).localeCompare(String(second), undefined, { sensitivity: 'base' });
}

function getPagination(query: ListOutreachRecordsQuery): OutreachPagination {
  return {
    page: clampNumber(query.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(query.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

function clampNumber(value: string | number | undefined, min: number, max: number, fallback: number): number {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getPageRecords(records: Outreach[], { page, pageSize }: OutreachPagination): Outreach[] {
  const start = (page - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function createPagination(totalRecords: number, { page, pageSize }: OutreachPagination) {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}

function createChartResponse(records: Outreach[], range: string, clock: IClock) {
  const now = getClockDate(clock);
  const sentRecords = records.filter(record => record.status === 'sent');
  const buckets = createBuckets(range, now, sentRecords);
  const repliesObtained = sentRecords.filter(record => record.replyObtained).length;
  const sentWithoutReply = sentRecords.length - repliesObtained;

  for (const record of sentRecords) {
    const date = parseRecordDate(record);
    const key = getBucketKey(date, buckets.granularity);
    const bucket = buckets.items.get(key);
    if (!bucket) continue;

    bucket.sent += 1;
    if (record.replyObtained) bucket.repliesObtained += 1;
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

function getClockDate(clock: IClock): Date {
  return clock?.today ? new Date(`${clock.today()}T00:00:00.000Z`) : new Date();
}

function parseRecordDate(record: Outreach): Date {
  return new Date(record.dateSent || record.updatedAt || record.createdAt || '');
}

function createBuckets(range: string, now: Date, records: Outreach[]) {
  if (range === '7d') return createDailyBuckets(now, 7);
  if (range === '30d') return createDailyBuckets(now, 30);
  if (range === 'monthly') return createMonthlyBuckets(now, 12);

  return createAllTimeBuckets(records);
}

function createDailyBuckets(now: Date, days: number): { granularity: 'day'; items: Map<string, OutreachChartPoint> } {
  const items = new Map<string, OutreachChartPoint>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = getBucketKey(date, 'day');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'day', items };
}

function createMonthlyBuckets(now: Date, months: number): { granularity: 'month'; items: Map<string, OutreachChartPoint> } {
  const items = new Map<string, OutreachChartPoint>();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = getBucketKey(date, 'month');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'month', items };
}

function createAllTimeBuckets(records: Outreach[]): { granularity: 'month'; items: Map<string, OutreachChartPoint> } {
  const keys = records
    .map(record => getBucketKey(parseRecordDate(record), 'month'))
    .filter(Boolean)
    .sort();
  const uniqueKeys = keys.length ? [...new Set(keys)] : [getBucketKey(new Date(), 'month')];
  const items = new Map(uniqueKeys.map(key => [key, { label: key, sent: 0, repliesObtained: 0 }]));

  return { granularity: 'month', items };
}

function getBucketKey(date: Date, granularity: 'day' | 'month'): string {
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  if (granularity === 'month') {
    return `${year}-${month}`;
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
