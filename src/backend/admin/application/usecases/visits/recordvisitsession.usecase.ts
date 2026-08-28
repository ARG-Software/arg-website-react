import crypto from 'node:crypto';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { checkRateLimits, type IRateLimitConfig, type IRateLimitStore } from '../../../../shared/security/ratelimit.js';
import type { IAdminConfiguration } from '../../config/iadmin.configuration.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { VisitSession } from '../../../domain/visit.js';
import { VisitDomainError } from '../../../domain/errors/visitdomain.error.js';
import type { VisitGeolocationInput } from '../../../domain/types/visit.types.js';

export interface RecordVisitSessionInput {
  clientIp: string;
  geo: VisitGeolocationInput;
  sessionId?: string;
  events?: unknown[];
  pageViews?: unknown[];
  language?: string;
  referrer?: string;
}

export class RecordVisitSessionUseCase {
  constructor(
    private readonly configuration: IAdminConfiguration,
    private readonly visitRepository: IVisitRepository,
    private readonly visitRateLimit: { store: IRateLimitStore; config: IRateLimitConfig },
    private readonly logger?: ILogger
  ) {}

  async execute(input: RecordVisitSessionInput): Promise<void> {
    try {
      const rateLimit = await checkRateLimits(
        input.clientIp,
        this.visitRateLimit.store,
        this.visitRateLimit.config
      );

      if (!rateLimit.allowed) {
        const error = new Error('Too many requests. Please try again later.') as Error & {
          code: string;
          statusCode: number;
        };
        error.code = 'rate_limited';
        error.statusCode = 429;
        throw error;
      }
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'rate_limited') throw error;

      this.logger?.error('Visit log rate limit check failed open', { error });
    }

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
    });

    await this.visitRepository.recordSession(record);
  }
}
