import { createErrorBody, readJsonBody, readSearchParams } from '../../../../shared/api/http.js';
import { getRagErrorStatus, isConfigurationError } from '../../../application/errors.js';

export class ControllerBase {
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
}
