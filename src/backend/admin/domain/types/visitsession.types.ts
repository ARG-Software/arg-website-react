import type {
  VisitEvent,
  VisitEventInput,
  VisitPageView,
  VisitPageViewInput,
} from './visitevents.types.js';

export type VisitGeolocationInput = {
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
};

export type VisitAttributionInput = {
  referrer?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
  clickId?: string | null;
};

export type VisitSessionConstructorParams = {
  sessionHash: string;
  events?: VisitEventInput[];
  pageViews?: VisitPageViewInput[];
  geo?: VisitGeolocationInput;
  language?: string;
  referrer?: string;
  attribution?: VisitAttributionInput;
};

export type VisitSessionRecord = {
  sessionHash: string;
  countryCode: string | null;
  region: string;
  city: string;
  timezone: string;
  language: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  clickId: string | null;
  entryPath: string;
  events: VisitEvent[];
  pageViews: VisitPageView[];
  startedAt: string;
  lastSeenAt: string;
};

export type VisitSessionListItem = {
  id: string;
  sessionHash: string;
  countryCode: string | null;
  region: string;
  city: string;
  timezone: string;
  entryPath: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  clickId: string | null;
  pageCount: number;
  eventCount: number;
  durationMs: number;
  startedAt: string;
  lastSeenAt: string;
};

export type VisitPagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
};

export type VisitSessionListResult = {
  records: VisitSessionListItem[];
  pagination: VisitPagination;
};
