import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  VisitBreakdownMetric,
  VisitBreakdownQuery,
  VisitChartResult,
  VisitChartSeries,
  VisitMetricBreakdownItem,
  VisitMetricRange,
  VisitPageBreakdownSortField,
  VisitStatMetric,
  VisitStatResult,
} from '../../../domain/types/visitmetrics.types.js';
import type { IVisitEventRepository } from '../../ports/repositories/ivisitevent.repository.js';
import type {
  IVisitPageViewRepository,
  VisitMetricPageViewRecord,
} from '../../ports/repositories/ivisitpageview.repository.js';
import type {
  IVisitSessionRepository,
  VisitMetricSessionRecord,
} from '../../ports/repositories/ivisitsession.repository.js';
import { createPagination, getPagination } from '../pagination.js';

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

type VisitRangeBounds = {
  from: Date | null;
  to: Date;
  granularity: 'day' | 'month';
};

type VisitChartBucket = {
  label: string;
  pageViews: number;
  visits: Set<string>;
  events: number;
};

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
  constructor(
    private readonly sessionRepository: IVisitSessionRepository,
    private readonly pageViewRepository: IVisitPageViewRepository,
    private readonly eventRepository: IVisitEventRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListVisitMetricsInput = {}) {
    const range = normalizeRange(input.range);
    const metric = input.metric || 'chart';

    this.logger?.info('Visit metrics use case started', { metric, range });

    if (STAT_METRICS.has(metric)) {
      const result = await this.getStat(metric as VisitStatMetric, range);
      this.logger?.info('Visit metrics use case completed', { metric, range, value: result.value });
      return result;
    }

    if (BREAKDOWN_METRICS.has(metric)) {
      const pagination = getPagination(input);
      const query: VisitBreakdownQuery =
        metric === 'pages' ? { ...pagination, ...normalizePageSort(input) } : pagination;
      const result = await this.getBreakdown(metric as VisitBreakdownMetric, range, query);

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
    const result = await this.getChart(range, series);
    this.logger?.info('Visit metrics use case completed', {
      metric: 'chart',
      range,
      series,
      pointCount: result.points.length,
    });
    return result;
  }

  private async getStat(metric: VisitStatMetric, range: VisitMetricRange): Promise<VisitStatResult> {
    const bounds = getVisitRangeBounds(range);
    let value = 0;

    if (metric === 'events') {
      value = (await this.eventRepository.findForMetricRange(toRangeQuery(bounds))).length;
    } else {
      const pageViews = await this.pageViewRepository.findForMetricRange(toRangeQuery(bounds));

      if (metric === 'page_views') value = pageViews.length;
      if (metric === 'visits') value = getSessionHashes(pageViews).length;
      if (metric === 'countries') {
        const sessions = await this.sessionRepository.findMetricsByHashes(getSessionHashes(pageViews));
        value = new Set(sessions.map(row => row.countryCode).filter(countryCode => countryCode)).size;
      }
    }

    return { metric, range, value };
  }

  private async getChart(
    range: VisitMetricRange,
    series: VisitChartSeries
  ): Promise<VisitChartResult> {
    const bounds = getVisitRangeBounds(range);
    const [pageViews, events] = await Promise.all([
      series === 'events'
        ? Promise.resolve([])
        : this.pageViewRepository.findForMetricRange(toRangeQuery(bounds)),
      series === 'page_views' || series === 'visits'
        ? Promise.resolve([])
        : this.eventRepository.findForMetricRange(toRangeQuery(bounds)),
    ]);

    return {
      range,
      series,
      points: createVisitChartPoints(range, series, bounds, pageViews, events),
    };
  }

  private async getBreakdown(
    metric: VisitBreakdownMetric,
    range: VisitMetricRange,
    {
      page = 1,
      pageSize = 10,
      sortBy = 'pageViews',
      sortDirection = 'desc',
    }: VisitBreakdownQuery = {}
  ) {
    const bounds = getVisitRangeBounds(range);
    const pageViews = await this.pageViewRepository.findForMetricRange(toRangeQuery(bounds));

    if (metric === 'pages') {
      const records = createPageBreakdown(pageViews, sortBy, sortDirection);

      return { metric, range, ...paginateVisitBreakdown(records, page, pageSize) };
    }

    const sessionPageViews = countPageViewsBySession(pageViews);
    const sessions = await this.sessionRepository.findMetricsByHashes(Array.from(sessionPageViews.keys()));
    const records = createSessionBreakdown(metric, sessionPageViews, sessions);

    return { metric, range, ...paginateVisitBreakdown(records, page, pageSize) };
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

function toRangeQuery(bounds: VisitRangeBounds) {
  return {
    fromIso: bounds.from?.toISOString() || null,
    toIso: bounds.to.toISOString(),
  };
}

function getVisitRangeBounds(range: VisitMetricRange, now = new Date()): VisitRangeBounds {
  if (range === 'today') return { from: startOfUtcDay(now), to: now, granularity: 'day' };
  if (range === 'yesterday') {
    const today = startOfUtcDay(now);
    return { from: addUtcDays(today, -1), to: today, granularity: 'day' };
  }
  if (range === 'this_week') return { from: startOfUtcWeek(now), to: now, granularity: 'day' };
  if (range === 'last_week') {
    const thisWeek = startOfUtcWeek(now);
    return { from: addUtcDays(thisWeek, -7), to: thisWeek, granularity: 'day' };
  }
  if (range === 'this_month') return { from: startOfUtcMonth(now), to: now, granularity: 'day' };
  if (range === 'two_months') return { from: addUtcMonths(now, -2), to: now, granularity: 'day' };

  return { from: null, to: now, granularity: 'month' };
}

function createVisitChartPoints(
  range: VisitMetricRange,
  series: VisitChartSeries,
  bounds: VisitRangeBounds,
  pageViews: VisitMetricPageViewRecord[],
  events: { sessionHash: string; occurredAt: string }[]
) {
  const firstBucket = getFirstChartBucket(range, bounds, pageViews, events);
  if (!firstBucket) return [];

  const buckets = new Map<string, VisitChartBucket>();
  for (let bucket = firstBucket; bucket < bounds.to; bucket = addChartBucket(bucket, bounds)) {
    buckets.set(formatChartLabel(bucket, bounds.granularity), {
      label: formatChartLabel(bucket, bounds.granularity),
      pageViews: 0,
      visits: new Set<string>(),
      events: 0,
    });
  }

  pageViews.forEach(pageView => {
    const bucket = buckets.get(formatChartDate(pageView.startedAt, bounds.granularity));
    if (!bucket) return;

    bucket.pageViews += 1;
    bucket.visits.add(pageView.sessionHash);
  });

  events.forEach(event => {
    const bucket = buckets.get(formatChartDate(event.occurredAt, bounds.granularity));
    if (bucket) bucket.events += 1;
  });

  return Array.from(buckets.values()).map(bucket => {
    if (series === 'page_views') return { label: bucket.label, pageViews: bucket.pageViews };
    if (series === 'visits') return { label: bucket.label, visits: bucket.visits.size };
    if (series === 'events') return { label: bucket.label, events: bucket.events };

    return {
      label: bucket.label,
      pageViews: bucket.pageViews,
      visits: bucket.visits.size,
      events: bucket.events,
    };
  });
}

function getFirstChartBucket(
  range: VisitMetricRange,
  bounds: VisitRangeBounds,
  pageViews: VisitMetricPageViewRecord[],
  events: { occurredAt: string }[]
): Date | null {
  if (bounds.from) return truncateChartDate(bounds.from, bounds.granularity);

  const timestamps = [...pageViews.map(row => row.startedAt), ...events.map(row => row.occurredAt)];
  if (!timestamps.length) return null;

  const first = timestamps.reduce((earliest, value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp < earliest ? timestamp : earliest;
  }, Number.MAX_SAFE_INTEGER);

  if (first === Number.MAX_SAFE_INTEGER) return null;

  return truncateChartDate(new Date(first), range === 'all_time' ? 'month' : bounds.granularity);
}

function createPageBreakdown(
  pageViews: VisitMetricPageViewRecord[],
  sortBy: VisitBreakdownQuery['sortBy'],
  sortDirection: VisitBreakdownQuery['sortDirection']
): VisitMetricBreakdownItem[] {
  const pages = new Map<
    string,
    { pageViews: number; sessionHashes: Set<string>; durationMs: number; lastSeenAt: number }
  >();

  pageViews.forEach(pageView => {
    if (!pageView.path) return;

    const page = pages.get(pageView.path) || {
      pageViews: 0,
      sessionHashes: new Set<string>(),
      durationMs: 0,
      lastSeenAt: 0,
    };
    const lastSeenAt = Date.parse(pageView.endedAt || pageView.startedAt || '');

    page.pageViews += 1;
    page.sessionHashes.add(pageView.sessionHash);
    page.durationMs += Number(pageView.durationMs || 0);
    if (Number.isFinite(lastSeenAt)) page.lastSeenAt = Math.max(page.lastSeenAt, lastSeenAt);

    pages.set(pageView.path, page);
  });

  return Array.from(pages.entries())
    .map(([path, page]) => ({
      id: path,
      label: path,
      path,
      value: page.pageViews,
      pageViews: page.pageViews,
      uniqueVisitors: page.sessionHashes.size,
      averageDurationMs: Math.round(page.durationMs / page.pageViews),
      lastSeenAt: page.lastSeenAt ? new Date(page.lastSeenAt).toISOString() : undefined,
    }))
    .sort((first, second) => comparePageBreakdown(first, second, sortBy, sortDirection));
}

function countPageViewsBySession(pageViews: VisitMetricPageViewRecord[]): Map<string, number> {
  const sessionPageViews = new Map<string, number>();

  pageViews.forEach(pageView => {
    sessionPageViews.set(pageView.sessionHash, (sessionPageViews.get(pageView.sessionHash) || 0) + 1);
  });

  return sessionPageViews;
}

function getSessionHashes(pageViews: VisitMetricPageViewRecord[]): string[] {
  return Array.from(new Set(pageViews.map(row => row.sessionHash)));
}

function createSessionBreakdown(
  metric: VisitBreakdownMetric,
  sessionPageViews: Map<string, number>,
  sessions: VisitMetricSessionRecord[]
): VisitMetricBreakdownItem[] {
  const totals = new Map<string, number>();

  sessions.forEach(session => {
    const value = sessionPageViews.get(session.sessionHash) || 0;
    if (!value) return;

    let label = coalesceCountryCode(session.countryCode);
    if (metric === 'sources') label = getVisitAttributionLabel(session);
    if (metric === 'referrers') label = getVisitReferrerLabel(session);

    totals.set(label, (totals.get(label) || 0) + value);
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
}

function paginateVisitBreakdown(records: VisitMetricBreakdownItem[], page: number, pageSize: number) {
  const from = (page - 1) * pageSize;

  return {
    records: records.slice(from, from + pageSize),
    pagination: createPagination(page, pageSize, records.length),
  };
}

function comparePageBreakdown(
  first: VisitMetricBreakdownItem,
  second: VisitMetricBreakdownItem,
  sortBy: VisitBreakdownQuery['sortBy'] = 'pageViews',
  sortDirection: VisitBreakdownQuery['sortDirection'] = 'desc'
): number {
  const direction = sortDirection === 'asc' ? 1 : -1;
  let result = 0;

  if (sortBy === 'path') result = String(first.path || '').localeCompare(String(second.path || ''));
  if (sortBy === 'pageViews') result = Number(first.pageViews || 0) - Number(second.pageViews || 0);
  if (sortBy === 'uniqueVisitors') {
    result = Number(first.uniqueVisitors || 0) - Number(second.uniqueVisitors || 0);
  }
  if (sortBy === 'averageDurationMs') {
    result = Number(first.averageDurationMs || 0) - Number(second.averageDurationMs || 0);
  }

  return result * direction || String(first.path || '').localeCompare(String(second.path || ''));
}

function getVisitAttributionLabel(session: VisitMetricSessionRecord): string {
  const source = normalizeLabel(session.source);
  if (source) return source;

  const clickId = normalizeLabel(session.clickId);
  if (clickId) return getClickIdLabel(clickId);

  const campaign = normalizeLabel(session.campaign);
  if (campaign) return campaign;

  const referrer = normalizeLabel(session.referrer);
  return referrer ? getReferrerHost(referrer) : '(direct)';
}

function getVisitReferrerLabel(session: VisitMetricSessionRecord): string {
  const referrer = normalizeLabel(session.referrer);
  return referrer ? getReferrerHost(referrer) : getVisitAttributionLabel(session);
}

function getClickIdLabel(clickId: string): string {
  const labels: Record<string, string> = {
    li_fat_id: 'linkedin',
    twclid: 'twitter',
    fbclid: 'facebook',
    gbraid: 'google',
    gclid: 'google',
    wbraid: 'google',
    msclkid: 'bing',
    ttclid: 'tiktok',
    rdt_cid: 'reddit',
    epik: 'pinterest',
    scid: 'snapchat',
    mc_cid: 'newsletter',
  };

  return labels[clickId] || clickId;
}

function normalizeLabel(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function getReferrerHost(referrer: string): string {
  try {
    return new URL(referrer).host.toLowerCase() || referrer;
  } catch {
    return referrer;
  }
}

function coalesceCountryCode(countryCode: string | null): string {
  return countryCode && countryCode.trim() ? countryCode : '??';
}

function truncateChartDate(date: Date, granularity: VisitRangeBounds['granularity']): Date {
  return granularity === 'month' ? startOfUtcMonth(date) : startOfUtcDay(date);
}

function addChartBucket(date: Date, bounds: VisitRangeBounds): Date {
  return bounds.granularity === 'month' ? addUtcMonths(date, 1) : addUtcDays(date, 1);
}

function formatChartDate(value: string, granularity: VisitRangeBounds['granularity']): string {
  return formatChartLabel(truncateChartDate(new Date(value), granularity), granularity);
}

function formatChartLabel(date: Date, granularity: VisitRangeBounds['granularity']): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  if (granularity === 'month') return `${year}-${month}`;

  return `${year}-${month}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  return addUtcDays(startOfUtcDay(date), -((day + 6) % 7));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}
