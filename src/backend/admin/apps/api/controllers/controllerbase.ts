import { createAdminError, getAdminErrorStatus } from '../../../application/errors.js';
import type { IUserIdentity } from '../../../application/ports/iuseridentity.provider.js';
import { ApiControllerBase } from '../../../../shared/api/controllerbase.js';
import { createErrorBody } from '../../../../shared/api/http.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer } from '../../di/admin.container.js';
import { getAccessToken } from '../../http/usersession.cookies.js';

export class ControllerBase extends ApiControllerBase {
  constructor(logger?: ILogger) {
    super(logger);
  }

  protected authenticateUser(request: Request): Promise<IUserIdentity> {
    return adminContainer.auth.authenticateUserUseCase.execute(getAccessToken(request));
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
}
