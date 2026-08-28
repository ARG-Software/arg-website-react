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

export interface ListVisitCountryBreakdownInput {
  range?: string;
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitCountryBreakdownUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: ListVisitCountryBreakdownInput = {}): Promise<VisitBreakdownResult> {
    const result = await this.repository.getBreakdown(
      'countries',
      normalizeRange(input.range),
      getPagination(input)
    );

    return {
      ...result,
      records: result.records || [],
    };
  }
}

function normalizeRange(value?: string): VisitMetricRange {
  return (ALLOWED_RANGES.has(value || '') ? value : 'today') as VisitMetricRange;
}
