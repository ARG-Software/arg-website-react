import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { OUTREACH_STATUSES } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { OutreachStatus } from '../../../domain/types/outreach.types.js';
import type {
  IOutreachRepository,
  OutreachRecordListQuery,
  OutreachRecordSortField,
} from '../../ports/repositories/ioutreach.repository.js';
import { createPagination, getPagination } from '../pagination.js';
import type { Outreach } from '../../../domain/outreach.js';

type SortableOutreachField = OutreachRecordSortField;

const RECENT_SENT_LIMIT = 30;

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

const SORTABLE_FIELDS: readonly SortableOutreachField[] = ['companyName', 'createdAt', 'dateSent', 'followUpDate'];

export class ListOutreachRecordsUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository, private readonly logger?: ILogger) {}

  async execute(query: ListOutreachRecordsInput = {}) {
    const pagination = getPagination(query);
    const sort = getSort(query);
    const repositoryQuery = {
      ...pagination,
      status: getRequestedStatus(query) || undefined,
      companyName: getCompanyFilter(query.companyName),
      dateSentFrom: getDateFilter(query.dateSentFrom),
      dateSentTo: getDateFilter(query.dateSentTo),
      sortBy: sort.field,
      sortDirection: sort.direction,
      recentSent: isRecentSentQuery(query),
    };

    this.logger?.info('Outreach records list use case started', {
      page: repositoryQuery.page,
      pageSize: repositoryQuery.pageSize,
      status: repositoryQuery.status,
      sortBy: repositoryQuery.sortBy,
      sortDirection: repositoryQuery.sortDirection,
      recentSent: repositoryQuery.recentSent,
      hasCompanyNameFilter: Boolean(repositoryQuery.companyName),
      hasDateSentFrom: Boolean(repositoryQuery.dateSentFrom),
      hasDateSentTo: Boolean(repositoryQuery.dateSentTo),
    });

    const result = needsInMemoryList(repositoryQuery)
      ? await this.listRecordsInMemory(repositoryQuery)
      : await this.outreachRepository.listRecords(repositoryQuery);
    this.logger?.info('Outreach records list use case completed', {
      recordCount: result.records.length,
      totalRecords: result.totalRecords,
    });

    return {
      records: result.records,
      pagination: createPagination(repositoryQuery.page, repositoryQuery.pageSize, result.totalRecords),
    };
  }

  private async listRecordsInMemory(query: OutreachRecordListQuery) {
    let filteredRecords = query.recentSent
      ? await this.listRecentSentRecords(query)
      : await this.outreachRepository.list();

    filteredRecords = filteredRecords
      .filter(record => !query.status || record.status === query.status)
      .filter(record => isCompanyNameMatch(record, query.companyName))
      .filter(record => !query.dateSentFrom || record.dateSent >= query.dateSentFrom)
      .filter(record => !query.dateSentTo || record.dateSent <= query.dateSentTo);

    if (query.recentSent) {
      filteredRecords = sortRecords(filteredRecords, { sortBy: 'dateSent', sortDirection: 'desc' }).slice(
        0,
        RECENT_SENT_LIMIT
      );
    }

    filteredRecords = sortRecords(filteredRecords, query);

    return {
      records: getPageRecords(filteredRecords, query),
      totalRecords: filteredRecords.length,
    };
  }

  private async listRecentSentRecords(query: OutreachRecordListQuery): Promise<Outreach[]> {
    const result = await this.outreachRepository.listRecords({
      ...query,
      page: 1,
      pageSize: RECENT_SENT_LIMIT,
      companyName: '',
      sortBy: 'dateSent',
      sortDirection: 'desc',
    });

    return result.records;
  }
}

function getRequestedStatus(query: ListOutreachRecordsInput): OutreachStatus | '' {
  if (isRecentSentQuery(query)) return 'sent';
  if (!query.status) return '';

  const status = String(query.status).trim();

  if (!OUTREACH_STATUSES.includes(status as OutreachStatus)) throw OutreachDomainError.invalidStatus();

  return status as OutreachStatus;
}

function getCompanyFilter(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getDateFilter(value: string | undefined): string {
  const date = String(value || '').trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function getSort(query: ListOutreachRecordsInput): { field: SortableOutreachField; direction: 'asc' | 'desc' } {
  if (isRecentSentQuery(query) && !query.sortBy) {
    return { field: 'dateSent', direction: 'desc' };
  }

  const field = String(query.sortBy || 'createdAt') as SortableOutreachField;
  const defaultDirection = field === 'companyName' ? 'asc' : 'desc';
  const direction =
    String(query.sortDirection || defaultDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!SORTABLE_FIELDS.includes(field)) throw OutreachDomainError.invalidSort();

  return { field, direction };
}

function isRecentSentQuery(query: ListOutreachRecordsInput): boolean {
  return query.recentSent === true || query.scope === 'recent_sent';
}

function needsInMemoryList(query: OutreachRecordListQuery): boolean {
  return Boolean(query.companyName) || query.sortBy === 'companyName' || query.recentSent;
}

function isCompanyNameMatch(record: Outreach, companyName = ''): boolean {
  return !companyName || record.companyName.toLowerCase().includes(companyName);
}

function sortRecords(
  records: Outreach[],
  query: { sortBy: OutreachRecordSortField; sortDirection: 'asc' | 'desc' }
): Outreach[] {
  const direction = query.sortDirection === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    const comparison = compareValues(getSortValue(first, query.sortBy), getSortValue(second, query.sortBy));

    return comparison * direction;
  });
}

function getSortValue(record: Outreach, field: OutreachRecordSortField): string | number {
  if (field === 'createdAt') return Date.parse(record.createdAt || '') || 0;
  if (field === 'dateSent') return Date.parse(record.dateSent || '') || 0;
  if (field === 'followUpDate') return Date.parse(record.followUpDate || '') || 0;

  return String(record.companyName || '').toLowerCase();
}

function compareValues(first: string | number, second: string | number): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second;

  return String(first).localeCompare(String(second), undefined, { sensitivity: 'base' });
}

function getPageRecords(records: Outreach[], query: OutreachRecordListQuery): Outreach[] {
  const start = (query.page - 1) * query.pageSize;
  return records.slice(start, start + query.pageSize);
}
