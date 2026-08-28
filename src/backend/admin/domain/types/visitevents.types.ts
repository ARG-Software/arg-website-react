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

export type VisitJourneyEvent = {
  sessionHash: string;
  type: 'page_view' | 'event';
  name: string;
  params: Record<string, string | number | boolean | null>;
  sequence: string | number;
  path: string;
  title: string;
  countryCode: string | null;
  region: string;
  city: string;
  timezone: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  clickId: string | null;
  visitedAt: string;
  endedAt: string;
  durationMs: string | number;
};
