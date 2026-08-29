import crypto from 'node:crypto';

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
    private readonly visitRepository: IVisitRepository
  ) {}

  async execute(input: RecordVisitSessionInput): Promise<void> {
    if (!input.sessionId) throw VisitDomainError.missingSessionId();

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

    await this.visitRepository.recordSession(record);
  }
}
