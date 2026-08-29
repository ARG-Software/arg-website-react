import crypto from 'node:crypto';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IAdminConfiguration } from '../../config/iadmin.configuration.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { VisitSession } from '../../../domain/visit.js';
import { VisitDomainError } from '../../../domain/errors/visitdomain.error.js';
import type {
  VisitAttributionInput,
  VisitGeolocationInput,
} from '../../../domain/types/visitsession.types.js';

export interface RecordVisitSessionInput {
  geo: VisitGeolocationInput;
  sessionId?: string;
  events?: unknown[];
  pageViews?: unknown[];
  language?: string;
  referrer?: string;
  attribution?: VisitAttributionInput;
}

export class RecordVisitSessionUseCase {
  constructor(
    private readonly configuration: IAdminConfiguration,
    private readonly visitRepository: IVisitRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: RecordVisitSessionInput): Promise<void> {
    if (!input.sessionId) {
      this.logger?.warn('Visit session record rejected', { reason: 'missing_session_id' });
      throw VisitDomainError.missingSessionId();
    }

    const record = new VisitSession({
      sessionHash: crypto
        .createHmac('sha256', this.configuration.getVisitHashKey())
        .update(input.sessionId)
        .digest('hex')
        .slice(0, 16),
      events: input.events as any,
      pageViews: input.pageViews as any,
      geo: input.geo,
      language: input.language,
      referrer: input.referrer,
      attribution: input.attribution,
    });

    this.logger?.info('Visit session record started', {
      sessionHash: record.sessionHash,
      pageViewCount: record.pageViews.length,
      eventCount: record.events.length,
      entryPath: record.entryPath,
    });
    await this.visitRepository.recordSession(record);
    this.logger?.info('Visit session record completed', {
      sessionHash: record.sessionHash,
      pageViewCount: record.pageViews.length,
      eventCount: record.events.length,
    });
  }
}
