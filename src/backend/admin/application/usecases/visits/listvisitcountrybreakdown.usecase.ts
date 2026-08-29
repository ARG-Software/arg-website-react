import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  VisitBreakdownResult,
  VisitMetricRange,
} from '../../../domain/types/visitmetrics.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { getPagination } from '../pagination.js';

const ALLOWED_RANGES = new Set([
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'two_months',
  'all_time',
]);
const MAX_COUNTRY_PAGE_SIZE = 250;

export interface ListVisitCountryBreakdownInput {
  range?: string;
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitCountryBreakdownUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: ListVisitCountryBreakdownInput = {}): Promise<VisitBreakdownResult> {
    const range = normalizeRange(input.range);
    const pagination = getPagination(input, { maxPageSize: MAX_COUNTRY_PAGE_SIZE });
    this.logger?.info('Visit country breakdown use case started', { range, ...pagination });
    const result = await this.repository.getBreakdown(
      'countries',
      range,
      pagination
    );
    this.logger?.info('Visit country breakdown use case completed', {
      range,
      recordCount: result.records?.length || 0,
      totalRecords: result.pagination?.totalRecords,
    });

    return {
      ...result,
      records: result.records || [],
    };
  }
}

function normalizeRange(value?: string): VisitMetricRange {
  return (ALLOWED_RANGES.has(value || '') ? value : 'today') as VisitMetricRange;
}
