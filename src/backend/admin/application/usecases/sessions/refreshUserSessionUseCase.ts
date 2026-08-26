import { createAdminError } from '../../errors.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserSession,
} from '../../ports/IUserIdentityProvider.js';
import type { UserAccessPolicy } from '../../policies/userAccessPolicy.js';

export class RefreshUserSessionUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly userAccessPolicy: UserAccessPolicy
  ) {}

  async execute(refreshToken: string): Promise<{ session: IUserSession; user: IUserIdentity }> {
    if (!refreshToken) {
      throw createAdminError(401, 'unauthenticated', 'Refresh token required');
    }

    const result = await this.identityProvider.refreshSession(refreshToken);

    if (result.error || !result.session || !result.user?.email) {
      throw createAdminError(401, 'unauthenticated', 'Refresh token expired');
    }

    if (!(await this.userAccessPolicy.canAccess(result.user.email))) {
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    return {
      session: result.session,
      user: result.user,
    };
  }
}
