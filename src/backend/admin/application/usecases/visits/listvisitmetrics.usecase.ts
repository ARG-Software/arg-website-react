import type {
  VisitBreakdownMetric,
  VisitChartSeries,
  VisitMetricRange,
  VisitStatMetric,
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
const STAT_METRICS = new Set(['page_views', 'visits', 'events', 'countries']);
const BREAKDOWN_METRICS = new Set(['countries', 'pages', 'sources', 'referrers']);
const CHART_SERIES = new Set(['all', 'page_views', 'visits', 'events']);

export interface ListVisitMetricsInput {
  metric?: string;
  range?: string;
  series?: string;
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitMetricsUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: ListVisitMetricsInput = {}) {
    const range = normalizeRange(input.range);
    const metric = input.metric || 'chart';

    if (STAT_METRICS.has(metric)) {
      return this.repository.getStat(metric as VisitStatMetric, range);
    }

    if (BREAKDOWN_METRICS.has(metric)) {
      return this.repository.getBreakdown(
        metric as VisitBreakdownMetric,
        range,
        getPagination(input)
      );
    }

    return this.repository.getChart(range, normalizeSeries(input.series));
  }
}

function normalizeRange(value?: string): VisitMetricRange {
  return (ALLOWED_RANGES.has(value || '') ? value : 'today') as VisitMetricRange;
}

function normalizeSeries(value?: string): VisitChartSeries {
  return (CHART_SERIES.has(value || '') ? value : 'all') as VisitChartSeries;
}
