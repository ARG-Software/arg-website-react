import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { VisitJourneyEvent } from '../../../domain/types/visitevents.types.js';
import type { IVisitEventRepository, VisitEventRecord } from '../../ports/repositories/ivisitevent.repository.js';
import type {
  IVisitPageViewRepository,
  VisitPageViewRecord,
} from '../../ports/repositories/ivisitpageview.repository.js';
import type {
  IVisitSessionRepository,
  VisitJourneySessionRecord,
} from '../../ports/repositories/ivisitsession.repository.js';

export interface ListVisitJourneyInput {
  sessionHash?: string;
}

export class ListVisitJourneyUseCase {
  constructor(
    private readonly sessionRepository: IVisitSessionRepository,
    private readonly pageViewRepository: IVisitPageViewRepository,
    private readonly eventRepository: IVisitEventRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListVisitJourneyInput = {}): Promise<{ events: VisitJourneyEvent[] }> {
    const sessionHash = input.sessionHash || '';

    if (!sessionHash) {
      this.logger?.warn('Visit journey lookup rejected', { reason: 'missing_session_hash' });
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    this.logger?.info('Visit journey lookup started', { sessionHash });
    const [session, pageViews, eventRows] = await Promise.all([
      this.sessionRepository.findJourneyByHash(sessionHash),
      this.pageViewRepository.findBySessionHash(sessionHash),
      this.eventRepository.findBySessionHash(sessionHash),
    ]);
    const events = createJourneyEvents(session, pageViews, eventRows);
    this.logger?.info('Visit journey lookup completed', { sessionHash, eventCount: events.length });

    return { events };
  }
}

function createJourneyEvents(
  session: VisitJourneySessionRecord,
  pageViews: VisitPageViewRecord[],
  eventRows: VisitEventRecord[]
): VisitJourneyEvent[] {
  const pageViewEvents = pageViews.map(pageView => ({
    sessionHash: pageView.sessionHash,
    type: 'page_view' as const,
    name: 'page_view',
    params: {},
    sequence: pageView.sequence,
    path: pageView.path,
    title: pageView.title,
    countryCode: null,
    region: '',
    city: '',
    timezone: '',
    referrer: session.referrer,
    source: session.source,
    medium: session.medium,
    campaign: session.campaign,
    term: null,
    content: null,
    clickId: null,
    visitedAt: pageView.startedAt,
    endedAt: pageView.endedAt,
    durationMs: pageView.durationMs,
  }));

  const events = eventRows
    .filter(event => event.name && event.occurredAt)
    .map(event => ({
      sessionHash: event.sessionHash,
      type: 'event' as const,
      name: event.name,
      params: event.params,
      sequence: event.sequence,
      path: event.path,
      title: event.name,
      countryCode: null,
      region: '',
      city: '',
      timezone: '',
      referrer: session.referrer,
      source: session.source,
      medium: session.medium,
      campaign: session.campaign,
      term: null,
      content: null,
      clickId: null,
      visitedAt: event.occurredAt,
      endedAt: event.occurredAt,
      durationMs: 0,
    }));

  return [...pageViewEvents, ...events].sort(compareJourneyEvents);
}

function compareJourneyEvents(first: VisitJourneyEvent, second: VisitJourneyEvent): number {
  const firstSequence = Number(first.sequence);
  const secondSequence = Number(second.sequence);

  if (Number.isFinite(firstSequence) && Number.isFinite(secondSequence)) {
    return firstSequence - secondSequence;
  }

  return Date.parse(first.visitedAt || '') - Date.parse(second.visitedAt || '');
}
