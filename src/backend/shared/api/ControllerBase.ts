import type { Challenge, Solution } from 'altcha-lib';

import { readJsonBody, readSearchParams } from './http.js';
import {
  createAltchaChallenge as createChallenge,
  type AltchaSettings,
  verifyAltchaChallenge,
  verifyAltchaPayload,
} from '../security/altcha.js';

export abstract class ApiControllerBase {
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

  protected abstract createBotVerificationError(message: string): Error;
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
