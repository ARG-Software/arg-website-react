export type VisitEventInput = {
  name?: string;
  params?: Record<string, string | number | boolean | null>;
  sequence?: string | number;
  timestamp?: string;
  path?: string;
};

export type VisitPageViewInput = {
  path?: string;
  title?: string;
  sequence?: string | number;
  startedAt?: string;
  endedAt?: string;
  durationMs?: string | number;
};

export type VisitGeolocationInput = {
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
};

export type VisitSessionConstructorParams = {
  sessionHash: string;
  events?: VisitEventInput[];
  pageViews?: VisitPageViewInput[];
  geo?: VisitGeolocationInput;
  language?: string;
  referrer?: string;
};

export type VisitEvent = {
  name: string;
  params: Record<string, string | number | boolean | null>;
  sequence: string | number;
  timestamp: string;
  path: string;
};

export type VisitPageView = {
  path: string;
  title: string;
  sequence: string | number;
  startedAt: string;
  endedAt: string;
  durationMs: string | number;
};

export type VisitSessionRecord = {
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
};

export type VisitMetricsData = {
  summary?: VisitMetricsSummary;
  points?: VisitMetricsPoint[];
  countryBreakdown?: VisitMetricBreakdownItem[];
  topPages?: VisitMetricBreakdownItem[];
  topReferrers?: VisitMetricBreakdownItem[];
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
  visits: number;
  uniqueVisitors?: number;
};

export type VisitMetricBreakdownItem = {
  label: string;
  value: number;
};

export type VisitPagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
};

export type VisitSessionListResult = {
  records: VisitSessionRecord[];
  pagination: VisitPagination;
};
