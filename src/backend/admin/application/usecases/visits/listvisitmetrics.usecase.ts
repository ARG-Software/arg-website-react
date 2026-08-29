import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  VisitBreakdownQuery,
  VisitBreakdownMetric,
  VisitChartSeries,
  VisitMetricRange,
  VisitPageBreakdownSortField,
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
const BREAKDOWN_METRICS = new Set(['pages', 'sources', 'referrers']);
const CHART_SERIES = new Set(['all', 'page_views', 'visits', 'events']);
const PAGE_BREAKDOWN_SORT_FIELDS = new Set([
  'path',
  'pageViews',
  'uniqueVisitors',
  'averageDurationMs',
]);

export interface ListVisitMetricsInput {
  metric?: string;
  range?: string;
  series?: string;
  page?: string | number;
  pageSize?: string | number;
  sortBy?: string;
  sortDirection?: string;
}

export class ListVisitMetricsUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: ListVisitMetricsInput = {}) {
    const range = normalizeRange(input.range);
    const metric = input.metric || 'chart';

    this.logger?.info('Visit metrics use case started', { metric, range });

    if (STAT_METRICS.has(metric)) {
      const result = await this.repository.getStat(metric as VisitStatMetric, range);
      this.logger?.info('Visit metrics use case completed', { metric, range, value: result.value });
      return result;
    }

    if (BREAKDOWN_METRICS.has(metric)) {
      const pagination = getPagination(input);
      const query: VisitBreakdownQuery =
        metric === 'pages' ? { ...pagination, ...normalizePageSort(input) } : pagination;

      const result = await this.repository.getBreakdown(metric as VisitBreakdownMetric, range, query);
      this.logger?.info('Visit metrics use case completed', {
        metric,
        range,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        recordCount: result.records.length,
      });
      return result;
    }

    const series = normalizeSeries(input.series);
    const result = await this.repository.getChart(range, series);
    this.logger?.info('Visit metrics use case completed', {
      metric: 'chart',
      range,
      series,
      pointCount: result.points.length,
    });
    return result;
  }
}

function normalizeRange(value?: string): VisitMetricRange {
  return (ALLOWED_RANGES.has(value || '') ? value : 'today') as VisitMetricRange;
}

function normalizeSeries(value?: string): VisitChartSeries {
  return (CHART_SERIES.has(value || '') ? value : 'all') as VisitChartSeries;
}

function normalizePageSort(input: ListVisitMetricsInput) {
  return {
    sortBy: (PAGE_BREAKDOWN_SORT_FIELDS.has(input.sortBy || '')
      ? input.sortBy
      : 'pageViews') as VisitPageBreakdownSortField,
    sortDirection: String(input.sortDirection || '').toLowerCase() === 'asc' ? 'asc' : 'desc',
  };
}
