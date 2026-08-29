import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserSession,
} from '../../ports/iuseridentity.provider.js';
import type { UserAccessPolicy } from '../../policies/useraccess.policy.js';

export class RefreshUserSessionUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly userAccessPolicy: UserAccessPolicy,
    private readonly logger?: ILogger
  ) {}

  async execute(refreshToken: string): Promise<{ session: IUserSession; user: IUserIdentity }> {
    if (!refreshToken) {
      this.logger?.warn('Admin session refresh rejected', { reason: 'missing_refresh_token' });
      throw createAdminError(401, 'unauthenticated', 'Refresh token required');
    }

    const result = await this.identityProvider.refreshSession(refreshToken);

    if (result.error || !result.session || !result.user?.email) {
      this.logger?.warn('Admin session refresh rejected', { reason: 'invalid_refresh_token', hasProviderError: Boolean(result.error) });
      throw createAdminError(401, 'unauthenticated', 'Refresh token expired');
    }

    if (!(await this.userAccessPolicy.canAccess(result.user.email))) {
      this.logger?.warn('Admin session refresh rejected', { reason: 'forbidden' });
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    this.logger?.info('Admin session refresh completed');

    return {
      session: result.session,
      user: result.user,
    };
  }
}
