import { VisitDomainError } from './errors/visitdomain.error.js';
import type {
  VisitEvent,
  VisitEventInput,
  VisitPageView,
  VisitPageViewInput,
  VisitSessionConstructorParams,
} from './types/visit.types.js';

export class VisitSession {
  readonly sessionHash: string;
  readonly countryCode: string | null;
  readonly region: string;
  readonly city: string;
  readonly timezone: string;
  readonly language: string;
  readonly referrer: string | null;
  readonly source: string | null;
  readonly medium: string | null;
  readonly campaign: string | null;
  readonly term: string | null;
  readonly content: string | null;
  readonly clickId: string | null;
  readonly entryPath: string;
  readonly events: VisitEvent[];
  readonly pageViews: VisitPageView[];
  readonly startedAt: string;
  readonly lastSeenAt: string;

  constructor(params: VisitSessionConstructorParams) {
    const events = this.createEvents(params.events || []);
    const pageViews = this.createPageViews(params.pageViews || []);
    const firstPageView = pageViews[0];
    const lastSeenAt =
      [
        ...events.map(event => event.timestamp),
        ...pageViews.map(pageView => pageView.endedAt || pageView.startedAt),
      ]
        .sort()
        .at(-1) || new Date().toISOString();

    if (!events.length && !pageViews.length) throw VisitDomainError.emptyPayload();

    this.sessionHash = params.sessionHash;
    this.countryCode = params.geo?.countryCode || null;
    this.region = params.geo?.region || '';
    this.city = params.geo?.city || '';
    this.timezone = params.geo?.timezone || '';
    this.language = params.language || '';
    this.referrer = params.attribution?.referrer || params.referrer || null;
    this.source = params.attribution?.source || null;
    this.medium = params.attribution?.medium || null;
    this.campaign = params.attribution?.campaign || null;
    this.term = params.attribution?.term || null;
    this.content = params.attribution?.content || null;
    this.clickId = params.attribution?.clickId || null;
    this.entryPath =
      firstPageView?.path || events[0]?.path || String(events[0]?.params.page_path || '') || '/';
    this.events = events;
    this.pageViews = pageViews;
    this.startedAt = firstPageView?.startedAt || events[0]?.timestamp || new Date().toISOString();
    this.lastSeenAt = lastSeenAt;
  }

  private createEvents(value: VisitEventInput[]): VisitEvent[] {
    const events: VisitEvent[] = [];

    for (const item of value) {
      if (!item.name || !item.timestamp) continue;

      events.push({
        name: item.name,
        params: item.params || {},
        sequence: item.sequence || 0,
        timestamp: item.timestamp,
        path: item.path || '',
      });
    }

    return events;
  }

  private createPageViews(value: VisitPageViewInput[]): VisitPageView[] {
    const pageViews: VisitPageView[] = [];

    for (const item of value) {
      if (!item.path || !item.startedAt) continue;

      pageViews.push({
        path: item.path,
        title: item.title || '',
        sequence: item.sequence || 0,
        startedAt: item.startedAt,
        endedAt: item.endedAt || item.startedAt,
        durationMs: item.durationMs || 0,
      });
    }

    return pageViews;
  }
}
