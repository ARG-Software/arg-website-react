import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserSession,
} from '../../ports/iuseridentity.provider.js';
import type { UserAccessPolicy } from '../../policies/useraccess.policy.js';

export class GetUserSessionUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly userAccessPolicy: UserAccessPolicy,
    private readonly logger?: ILogger
  ) {}

  async execute(tokens: { accessToken?: string; refreshToken?: string }): Promise<{
    user: IUserIdentity;
    session: IUserSession | null;
  }> {
    const { accessToken, refreshToken } = tokens;

    if (accessToken) {
      const user = await this.identityProvider.getUser(accessToken);

      if (user?.email && (await this.userAccessPolicy.canAccess(user.email))) {
        this.logger?.info('Admin session resolved from access token');
        return { user, session: null };
      }

      this.logger?.warn('Admin access token session lookup rejected');
    }

    if (refreshToken) {
      const result = await this.identityProvider.refreshSession(refreshToken);

      if (
        !result.error &&
        result.session &&
        result.user?.email &&
        (await this.userAccessPolicy.canAccess(result.user.email))
      ) {
        this.logger?.info('Admin session refreshed');
        return {
          user: result.user,
          session: result.session,
        };
      }

      this.logger?.warn('Admin refresh token session lookup rejected', { hasProviderError: Boolean(result.error) });
    }

    this.logger?.warn('Admin session lookup rejected', {
      reason: 'no_valid_session',
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
    });
    throw createAdminError(401, 'unauthenticated', 'Login expired');
  }
}
