import crypto from 'node:crypto';

import { checkRateLimits, type IRateLimitConfig, type IRateLimitStore } from '../../../../shared/security/rateLimit.js';
import type { IAdminConfiguration } from '../../config/IAdminConfiguration.js';
import type { IVisitGeolocationProvider } from '../../ports/IVisitGeolocationProvider.js';
import type { IVisitRepository } from '../../ports/repositories/IVisitRepository.js';
import { VisitSession } from '../../../domain/visit.js';
import { VisitDomainError } from '../../../domain/errors/VisitDomainError.js';
import type { VisitGeolocationInput } from '../../../domain/types/VisitTypes.js';

export interface RecordVisitSessionInput {
  clientIp: string;
  fallbackGeo: VisitGeolocationInput;
  sessionId?: string;
  events?: unknown[];
  pageViews?: unknown[];
  language?: string;
  referrer?: string;
}

export class RecordVisitSessionUseCase {
  constructor(
    private readonly configuration: IAdminConfiguration,
    private readonly geolocationProvider: IVisitGeolocationProvider,
    private readonly visitRepository: IVisitRepository,
    private readonly visitRateLimit: { store: IRateLimitStore; config: IRateLimitConfig }
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

      console.error('Visit log rate limit check failed, failing open:', error);
    }

    if (!input.sessionId) throw VisitDomainError.missingSessionId();

    const databaseGeo = await this.geolocationProvider.lookup(input.clientIp);
    const record = new VisitSession({
      sessionHash: crypto
        .createHmac('sha256', this.configuration.getVisitHashKey())
        .update(input.sessionId)
        .digest('hex')
        .slice(0, 16),
      events: input.events as any,
      pageViews: input.pageViews as any,
      geo: hasGeolocation(databaseGeo) ? databaseGeo : input.fallbackGeo,
      language: input.language,
      referrer: input.referrer,
    });

    await this.visitRepository.recordSession(record);
  }
}

function hasGeolocation(value: VisitGeolocationInput): boolean {
  return Boolean(value.countryCode || value.region || value.city || value.timezone);
}
