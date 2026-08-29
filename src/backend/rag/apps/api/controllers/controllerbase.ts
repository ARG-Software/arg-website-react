import { ApiControllerBase } from '../../../../shared/api/controllerbase.js';
import { createErrorBody } from '../../../../shared/api/http.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IRateLimitResult } from '../../../../shared/security/ratelimit.js';
import { createRagError, getRagErrorStatus, isConfigurationError } from '../../../application/errors.js';

export class ControllerBase extends ApiControllerBase {
  constructor(logger?: ILogger) {
    super(logger);
  }

  protected errorBody(error: any, fallbackCode: string, fallbackMessage: string): unknown {
    const statusCode = this.errorStatus(error);
    const serviceUnavailableMessage =
      fallbackCode === 'answer_failed' ? 'Assistant service is temporarily unavailable' : fallbackMessage;

    if (statusCode === 503 && error?.code === 'embedding_quota_exceeded') {
      return createErrorBody(error.code, serviceUnavailableMessage);
    }

    if (statusCode === 503 && isConfigurationError(error)) {
      return createErrorBody('configuration_error', serviceUnavailableMessage);
    }

    if (error?.code && statusCode !== 500) {
      if (statusCode === 429) {
        return {
          error: {
            code: error.code,
            message: error.message,
            limitScope: error.limitScope,
            retryAfterSeconds: error.retryAfterSeconds,
          },
        };
      }

      return createErrorBody(error.code, error.message);
    }

    return createErrorBody(fallbackCode, fallbackMessage);
  }

  protected errorStatus(error: any): number {
    return getRagErrorStatus(error);
  }

  protected createBotVerificationError(message: string): Error {
    return createRagError(403, 'bot_verification_failed', message);
  }

  protected createRateLimitError(result: IRateLimitResult): Error {
    const error = createRagError(429, 'rate_limited', 'Too many requests. Please try again later.') as Error & {
      limitScope?: string;
      retryAfterSeconds?: number;
    };

    error.limitScope = result.scope;
    error.retryAfterSeconds = result.retryAfterSeconds;

    return error;
  }
}
