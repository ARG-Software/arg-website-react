import { Outreach, OUTREACH_STATUSES } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { OutreachStatus } from '../../../domain/types/outreach.types.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';
import { getPagination } from '../pagination.js';

const RECENT_SENT_LIMIT = 30;
type SortableOutreachField = 'companyName' | 'dateSent' | 'followUpDate';

export interface ListOutreachRecordsInput {
  page?: string | number;
  pageSize?: string | number;
  status?: string;
  companyName?: string;
  dateSentFrom?: string;
  dateSentTo?: string;
  sortBy?: string;
  sortDirection?: string;
  scope?: string;
  recentSent?: boolean;
}

const SORTABLE_FIELDS: readonly SortableOutreachField[] = ['companyName', 'dateSent', 'followUpDate'];

export class ListOutreachRecordsUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository) {}

  async execute(query: ListOutreachRecordsInput = {}) {
    const records = await this.outreachRepository.list();
    const pagination = getPagination(query);
    const filteredRecords = filterRecords(records, query);

    const recentSent = isRecentSentQuery(query);
    const sortedRecords =
      recentSent
        ? sortRecords(getLatestSentRecords(filteredRecords), query)
        : sortRecords(filteredRecords, query);

    return {
      records: getPageRecords(sortedRecords, pagination),
      pagination: createPagination(sortedRecords.length, pagination),
    };
  }
}

function filterRecords(records: Outreach[], query: ListOutreachRecordsInput): Outreach[] {
  const status = getRequestedStatus(query);
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

function getRequestedStatus(query: ListOutreachRecordsInput): OutreachStatus | '' {
  if (isRecentSentQuery(query)) return 'sent';
  if (!query.status) return '';

  const status = String(query.status).trim();

  if (!OUTREACH_STATUSES.includes(status as OutreachStatus)) throw OutreachDomainError.invalidStatus();

  return status as OutreachStatus;
}

function getCompanySearchText(record: Outreach): string {
  return String(record.companyName || '').toLowerCase();
}

function getDateSentRange(query: ListOutreachRecordsInput): { from: string; to: string } {
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

function sortRecords(records: Outreach[], query: ListOutreachRecordsInput): Outreach[] {
  const sort = getSort(query);
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

function getSort(query: ListOutreachRecordsInput): { field: SortableOutreachField; direction: 'asc' | 'desc' } {
  if (isRecentSentQuery(query) && !query.sortBy) {
    return { field: 'dateSent', direction: 'desc' };
  }

  const field = String(query.sortBy || 'companyName') as SortableOutreachField;
  const defaultDirection = field === 'companyName' ? 'asc' : 'desc';
  const direction =
    String(query.sortDirection || defaultDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!SORTABLE_FIELDS.includes(field)) throw OutreachDomainError.invalidSort();

  return { field, direction };
}

function isRecentSentQuery(query: ListOutreachRecordsInput): boolean {
  return query.recentSent === true || query.scope === 'recent_sent';
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

function getPageRecords(records: Outreach[], { page, pageSize }: ReturnType<typeof getPagination>): Outreach[] {
  const start = (page - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function createPagination(totalRecords: number, { page, pageSize }: ReturnType<typeof getPagination>) {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}
