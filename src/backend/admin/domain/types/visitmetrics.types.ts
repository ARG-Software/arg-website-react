import type { VisitPagination } from './visitsession.types.js';

export type VisitMetricsData = {
  summary?: VisitMetricsSummary;
  points?: VisitMetricsPoint[];
  countryBreakdown?: VisitMetricBreakdownItem[];
  topPages?: VisitMetricBreakdownItem[];
  topReferrers?: VisitMetricBreakdownItem[];
  topSources?: VisitMetricBreakdownItem[];
};

export type VisitMetricsSummary = {
  total: number;
  visits: number;
  uniqueVisitors: number;
  today: number;
  countries: number;
};

export type VisitMetricsPoint = {
  label: string;
  pageViews?: number;
  visits?: number;
  events?: number;
  uniqueVisitors?: number;
};

export type VisitMetricBreakdownItem = {
  label: string;
  value: number;
  id?: string;
  path?: string;
  pageViews?: number;
  visits?: number;
  uniqueVisitors?: number;
  averageDurationMs?: number;
  lastSeenAt?: string;
};

export type VisitMetricRange =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'two_months'
  | 'all_time';

export type VisitStatMetric = 'page_views' | 'visits' | 'events' | 'countries';

export type VisitChartSeries = 'all' | 'page_views' | 'visits' | 'events';

export type VisitBreakdownMetric = 'countries' | 'pages' | 'sources' | 'referrers';

export type VisitStatResult = {
  metric: VisitStatMetric;
  range: VisitMetricRange;
  value: number;
};

export type VisitChartResult = {
  range: VisitMetricRange;
  series: VisitChartSeries;
  points: VisitMetricsPoint[];
};

export type VisitBreakdownResult = {
  metric: VisitBreakdownMetric;
  range: VisitMetricRange;
  records: VisitMetricBreakdownItem[];
  pagination?: VisitPagination;
};
