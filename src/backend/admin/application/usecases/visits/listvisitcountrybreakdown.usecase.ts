import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  VisitBreakdownResult,
  VisitMetricRange,
} from '../../../domain/types/visitmetrics.types.js';
import type { IVisitPageViewRepository } from '../../ports/repositories/ivisitpageview.repository.js';
import type { IVisitSessionRepository } from '../../ports/repositories/ivisitsession.repository.js';
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
const MAX_COUNTRY_PAGE_SIZE = 250;

type VisitRangeBounds = {
  from: Date | null;
  to: Date;
};

export interface ListVisitCountryBreakdownInput {
  range?: string;
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitCountryBreakdownUseCase {
  constructor(
    private readonly sessionRepository: IVisitSessionRepository,
    private readonly pageViewRepository: IVisitPageViewRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListVisitCountryBreakdownInput = {}): Promise<VisitBreakdownResult> {
    const range = normalizeRange(input.range);
    const pagination = getPagination(input, { maxPageSize: MAX_COUNTRY_PAGE_SIZE });
    this.logger?.info('Visit country breakdown use case started', { range, ...pagination });

    const bounds = getVisitRangeBounds(range);
    const pageViews = await this.pageViewRepository.findForMetricRange({
      fromIso: bounds.from?.toISOString() || null,
      toIso: bounds.to.toISOString(),
    });
    const sessionPageViews = new Map<string, number>();

    pageViews.forEach(pageView => {
      sessionPageViews.set(pageView.sessionHash, (sessionPageViews.get(pageView.sessionHash) || 0) + 1);
    });

    const sessions = await this.sessionRepository.findMetricsByHashes(Array.from(sessionPageViews.keys()));
    const totals = new Map<string, number>();

    sessions.forEach(session => {
      const value = sessionPageViews.get(session.sessionHash) || 0;
      if (!value) return;

      const label = session.countryCode && session.countryCode.trim() ? session.countryCode : '??';
      totals.set(label, (totals.get(label) || 0) + value);
    });

    const records = Array.from(totals.entries())
      .map(([label, value]) => ({ id: label, label, value }))
      .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
    const from = (pagination.page - 1) * pagination.pageSize;
    const result = {
      metric: 'countries' as const,
      range,
      records: records.slice(from, from + pagination.pageSize),
      pagination: createPagination(pagination.page, pagination.pageSize, records.length),
    };

    this.logger?.info('Visit country breakdown use case completed', {
      range,
      recordCount: result.records.length,
      totalRecords: result.pagination.totalRecords,
    });

    return result;
  }
}

function normalizeRange(value?: string): VisitMetricRange {
  return (ALLOWED_RANGES.has(value || '') ? value : 'today') as VisitMetricRange;
}

function getVisitRangeBounds(range: VisitMetricRange, now = new Date()): VisitRangeBounds {
  if (range === 'today') return { from: startOfUtcDay(now), to: now };
  if (range === 'yesterday') {
    const today = startOfUtcDay(now);
    return { from: addUtcDays(today, -1), to: today };
  }
  if (range === 'this_week') return { from: startOfUtcWeek(now), to: now };
  if (range === 'last_week') {
    const thisWeek = startOfUtcWeek(now);
    return { from: addUtcDays(thisWeek, -7), to: thisWeek };
  }
  if (range === 'this_month') return { from: startOfUtcMonth(now), to: now };
  if (range === 'two_months') return { from: addUtcMonths(now, -2), to: now };

  return { from: null, to: now };
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
