import { createAdminError, getAdminErrorStatus } from '../../../application/errors.js';
import type { AuthenticateUserUseCase } from '../../../application/usecases/sessions/authenticateuser.usecase.js';
import type { IUserIdentity } from '../../../application/ports/iuseridentity.provider.js';
import { ApiControllerBase } from '../../../../shared/api/controllerbase.js';
import { createErrorBody } from '../../../../shared/api/http.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IRateLimitResult } from '../../../../shared/security/ratelimit.js';
import { getAccessToken } from '../../http/usersession.cookies.js';

export class ControllerBase extends ApiControllerBase {
  constructor(
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    logger?: ILogger
  ) {
    super(logger);
  }

  protected authenticateUser(request: Request): Promise<IUserIdentity> {
    return this.authenticateUserUseCase.execute(getAccessToken(request));
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

  protected createBotVerificationError(message: string): Error {
    return createAdminError(403, 'bot_verification_failed', message);
  }

  protected createRateLimitError(result: IRateLimitResult): Error {
    const error = createAdminError(429, 'rate_limited', 'Too many requests. Please try again later.');
    error.limitScope = result.scope;
    error.retryAfterSeconds = result.retryAfterSeconds;

    return error;
  }
}
