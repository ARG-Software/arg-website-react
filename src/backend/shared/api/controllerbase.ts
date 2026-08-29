import type { Challenge, Solution } from 'altcha-lib';

import { getClientIp, readJsonBody, readSearchParams } from './http.js';
import {
  createAltchaChallenge as createChallenge,
  type AltchaSettings,
  verifyAltchaChallenge,
  verifyAltchaPayload,
} from '../security/altcha.js';
import type { ILogger } from '../logger/ilogger.js';
import type { IRateLimiter, IRateLimitResult } from '../security/ratelimit.js';

export abstract class ApiControllerBase {
  constructor(protected readonly logger?: ILogger) {}

  protected json(statusCode: number, body: unknown): Response {
    const responseBody =
      statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

    return new Response(responseBody, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  protected body(request: Request, options = {}): Promise<any> {
    return readJsonBody(request, options);
  }

  protected query(request: Request): Record<string, string> {
    return readSearchParams(request);
  }

  protected createAltchaChallenge(settings: AltchaSettings): Promise<Challenge> {
    return createChallenge(settings);
  }

  protected async verifyAltchaPayload(
    altcha: unknown,
    settings: Pick<AltchaSettings, 'altchaHmacKey'>
  ): Promise<void> {
    if (!altcha) {
      throw this.createBotVerificationError('Verification required');
    }

    const result = await verifyAltchaPayload(String(altcha), settings).catch(() => null);

    if (!result?.verified) {
      throw this.createBotVerificationError('Verification failed');
    }
  }

  protected async verifyAltchaChallenge(
    altcha: unknown,
    settings: Pick<AltchaSettings, 'altchaHmacKey'>
  ): Promise<void> {
    const payload = getAltchaChallenge(altcha);

    if (!payload) {
      throw this.createBotVerificationError('Verification required');
    }

    const result = await verifyAltchaChallenge(payload, settings).catch(() => null);

    if (!result?.verified) {
      throw this.createBotVerificationError('Verification failed');
    }
  }

  protected async checkRateLimit(request: Request, rateLimiter: IRateLimiter): Promise<void> {
    let result: IRateLimitResult;

    try {
      result = await rateLimiter.check(getClientIp(request));
    } catch (error) {
      this.logger?.error('API rate limit check failed open', { error });
      return;
    }

    if (!result.allowed) {
      throw this.createRateLimitError(result);
    }
  }

  protected abstract createBotVerificationError(message: string): Error;

  protected abstract createRateLimitError(result: IRateLimitResult): Error;
}

function getAltchaChallenge(value: unknown): { challenge: Challenge; solution: Solution } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as { challenge?: unknown; solution?: unknown };

  if (!payload.challenge || !payload.solution) {
    return null;
  }

  return {
    challenge: payload.challenge as Challenge,
    solution: payload.solution as Solution,
  };
}
