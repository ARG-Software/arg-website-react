import crypto from 'node:crypto';

import { VisitDomainError } from './errors/VisitDomainError.js';

const MAX_SESSION_ID_LENGTH = 160;
const MAX_PATH_LENGTH = 2048;
const MAX_TITLE_LENGTH = 240;
const MAX_LANGUAGE_LENGTH = 32;
const MAX_REFERRER_LENGTH = 2048;
const MAX_GEO_TEXT_LENGTH = 120;
const MAX_EVENTS_PER_SESSION = 250;
const MAX_PAGE_VIEWS_PER_SESSION = 100;

export interface VisitEventInput {
  name?: string;
  params?: Record<string, string | number | boolean | null>;
  sequence?: string | number;
  timestamp?: string;
  path?: string;
}

export interface VisitPageViewInput {
  path?: string;
  title?: string;
  sequence?: string | number;
  startedAt?: string;
  endedAt?: string;
  durationMs?: string | number;
}

export interface VisitGeolocationInput {
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface VisitSessionConstructorParams {
  sessionId: string;
  hashKey: string;
  events?: VisitEventInput[];
  pageViews?: VisitPageViewInput[];
  geo?: VisitGeolocationInput;
  language?: string;
  referrer?: string;
}

export interface VisitEvent {
  name: string;
  params: Record<string, string | number | boolean | null>;
  sequence: number;
  timestamp: string;
  path: string;
}

export interface VisitPageView {
  path: string;
  title: string;
  sequence: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export interface VisitSessionRecord {
  sessionHash: string;
  countryCode: string | null;
  region: string;
  city: string;
  timezone: string;
  language: string;
  referrer: string | null;
  entryPath: string;
  events: VisitEvent[];
  pageViews: VisitPageView[];
  startedAt: string;
  lastSeenAt: string;
}

export interface VisitMetricsData {
  summary?: VisitMetricsSummary;
  points?: VisitMetricsPoint[];
  countryBreakdown?: VisitMetricBreakdownItem[];
  topPages?: VisitMetricBreakdownItem[];
  topReferrers?: VisitMetricBreakdownItem[];
}

export interface VisitMetricsSummary {
  total: number;
  visits: number;
  uniqueVisitors: number;
  today: number;
  countries: number;
}

export interface VisitMetricsPoint {
  label: string;
  visits: number;
  uniqueVisitors?: number;
}

export interface VisitMetricBreakdownItem {
  label: string;
  value: number;
}

export interface VisitPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface VisitSessionListResult {
  records: VisitSessionRecord[];
  pagination: VisitPagination;
}

export class VisitSession {
  private readonly record: VisitSessionRecord;

  constructor(params: VisitSessionConstructorParams) {
    const sessionId = normalizeText(params.sessionId, MAX_SESSION_ID_LENGTH);
    if (!sessionId) throw VisitDomainError.missingSessionId();

    const sessionHash = crypto.createHmac('sha256', params.hashKey).update(sessionId).digest('hex').slice(0, 16);
    if (!sessionHash) throw VisitDomainError.missingSessionHash();

    const events = normalizeEvents(params.events || []);
    const pageViews = normalizePageViews(params.pageViews || []);
    const firstPageView = pageViews[0];

    if (!events.length && !pageViews.length) throw VisitDomainError.emptyPayload();

    this.record = {
      sessionHash,
      countryCode: normalizeCountryCode(params.geo?.countryCode || null),
      region: normalizeText(params.geo?.region || '', MAX_GEO_TEXT_LENGTH),
      city: normalizeText(params.geo?.city || '', MAX_GEO_TEXT_LENGTH),
      timezone: normalizeText(params.geo?.timezone || '', MAX_GEO_TEXT_LENGTH),
      language: normalizeText(params.language || '', MAX_LANGUAGE_LENGTH),
      referrer: normalizeReferrer(params.referrer || ''),
      entryPath: firstPageView?.path || normalizeEventPath(events[0]) || '/',
      events,
      pageViews,
      startedAt: firstPageView?.startedAt || events[0]?.timestamp || new Date().toISOString(),
      lastSeenAt: getLastSeenAt(events, pageViews),
    };
  }

  toRecord(): VisitSessionRecord {
    return this.record;
  }
}

export class VisitMetrics {
  constructor(private readonly data: VisitMetricsData) {}

  toResponse(): VisitMetricsData {
    return {
      summary: this.data.summary || createEmptySummary(),
      points: Array.isArray(this.data.points) ? this.data.points : [],
      countryBreakdown: Array.isArray(this.data.countryBreakdown) ? this.data.countryBreakdown : [],
      topPages: Array.isArray(this.data.topPages) ? this.data.topPages : [],
      topReferrers: Array.isArray(this.data.topReferrers) ? this.data.topReferrers : [],
    };
  }
}

export class VisitSessions {
  constructor(private readonly result: VisitSessionListResult) {}

  toResponse(): VisitSessionListResult {
    return {
      records: this.result.records || [],
      pagination: this.result.pagination,
    };
  }
}

export class VisitJourney {
  constructor(private readonly events: VisitEvent[]) {}

  toResponse(): { events: VisitEvent[] } {
    return {
      events: this.events || [],
    };
  }
}

function createEmptySummary(): VisitMetricsSummary {
  return {
    total: 0,
    visits: 0,
    uniqueVisitors: 0,
    today: 0,
    countries: 0,
  };
}

function normalizePath(value: string): string {
  const path = normalizeText(value, MAX_PATH_LENGTH);

  if (!path || !path.startsWith('/')) throw VisitDomainError.invalidPath();

  return path;
}

function normalizeSequence(value: string | number | undefined): number {
  const sequence = Number.parseInt(String(value || ''), 10);

  if (!Number.isInteger(sequence) || sequence < 1) throw VisitDomainError.invalidSequence();

  return sequence;
}

function normalizeEvents(value: VisitEventInput[]): VisitEvent[] {
  return value.slice(0, MAX_EVENTS_PER_SESSION).flatMap(item => {
    const name = normalizeText(item.name || '', 80);
    const timestamp = normalizeTimestamp(item.timestamp || '');
    if (!name || !timestamp) return [];

    return [
      {
        name,
        params: normalizeParams(item.params || {}),
        sequence: normalizeSequence(item.sequence),
        timestamp,
        path: normalizeOptionalPath(item.path || ''),
      },
    ];
  });
}

function normalizePageViews(value: VisitPageViewInput[]): VisitPageView[] {
  return value.slice(0, MAX_PAGE_VIEWS_PER_SESSION).flatMap(item => {
    const path = normalizeOptionalPath(item.path || '');
    const startedAt = normalizeTimestamp(item.startedAt || '');
    if (!path || !startedAt) return [];

    return [
      {
        path,
        title: normalizeText(item.title || '', MAX_TITLE_LENGTH),
        sequence: normalizeSequence(item.sequence),
        startedAt,
        endedAt: normalizeTimestamp(item.endedAt || '') || startedAt,
        durationMs: normalizeDurationMs(item.durationMs),
      },
    ];
  });
}

function normalizeOptionalPath(value: string): string {
  if (!value) return '';
  return normalizePath(value);
}

function normalizeEventPath(event?: VisitEvent): string {
  if (!event) return '/';

  return event.path || String(event.params.page_path || '') || '/';
}

function normalizeParams(
  value: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> {
  return { ...value };
}

function normalizeDurationMs(value: string | number | undefined): number {
  const durationMs = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(durationMs) || durationMs < 0) return 0;

  return durationMs;
}

function getLastSeenAt(events: VisitEvent[], pageViews: VisitPageView[]): string {
  const candidates = [
    ...events.map(event => event.timestamp),
    ...pageViews.map(pageView => pageView.endedAt || pageView.startedAt),
  ];

  return candidates.sort().at(-1) || new Date().toISOString();
}

function normalizeCountryCode(value: string | null): string | null {
  const countryCode = normalizeText(value || '', 2).toUpperCase();
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function normalizeReferrer(value: string): string | null {
  const referrer = normalizeText(value, MAX_REFERRER_LENGTH);
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    url.hash = '';

    return url.toString();
  } catch {
    return referrer.split('#')[0].slice(0, MAX_REFERRER_LENGTH);
  }
}

function normalizeText(value: string, maxLength: number): string {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeTimestamp(value: string): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}
