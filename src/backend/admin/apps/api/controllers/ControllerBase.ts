import { getAdminErrorStatus } from '../../../application/errors.js';
import type { IUserIdentity } from '../../../application/ports/IUserIdentityProvider.js';
import { createErrorBody, readJsonBody, readSearchParams } from '../../../../shared/api/http.js';
import { adminContainer } from '../../di/adminContainer.js';
import { getAccessToken } from '../../http/userSessionCookies.js';

export class ControllerBase {
  protected authenticateUser(request: Request): Promise<IUserIdentity> {
    return adminContainer.auth.authenticateUserUseCase.execute(getAccessToken(request));
  }

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
    if (error?.code && this.errorStatus(error) !== 500) {
      return createErrorBody(error.code, error.message);
    }

    return createErrorBody(fallbackCode, fallbackMessage);
  }

  protected errorStatus(error: any): number {
    return getAdminErrorStatus(error);
  }
}
