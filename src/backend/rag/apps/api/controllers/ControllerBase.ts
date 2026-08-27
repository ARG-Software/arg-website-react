import { ApiControllerBase } from '../../../../shared/api/ControllerBase.js';
import { createErrorBody } from '../../../../shared/api/http.js';
import { createRagError, getRagErrorStatus, isConfigurationError } from '../../../application/errors.js';

export class ControllerBase extends ApiControllerBase {
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
}
