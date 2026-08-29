import { OUTREACH_STATUSES } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { OutreachStatus } from '../../../domain/types/outreach.types.js';
import type {
  IOutreachRepository,
  OutreachRecordSortField,
} from '../../ports/repositories/ioutreach.repository.js';
import { getPagination } from '../pagination.js';

type SortableOutreachField = OutreachRecordSortField;

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
  constructor(private readonly outreachRepository: IOutreachRepository) {}

  async execute(query: ListOutreachRecordsInput = {}) {
    const pagination = getPagination(query);
    const sort = getSort(query);

    return this.outreachRepository.listRecords({
      ...pagination,
      status: getRequestedStatus(query) || undefined,
      companyName: getCompanyFilter(query.companyName),
      dateSentFrom: getDateFilter(query.dateSentFrom),
      dateSentTo: getDateFilter(query.dateSentTo),
      sortBy: sort.field,
      sortDirection: sort.direction,
      recentSent: isRecentSentQuery(query),
    });
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
