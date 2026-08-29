import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IUserIdentityProvider, IUserIdentity } from '../../ports/iuseridentity.provider.js';
import type { UserAccessPolicy } from '../../policies/useraccess.policy.js';

export class AuthenticateUserUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly userAccessPolicy: UserAccessPolicy,
    private readonly logger?: ILogger
  ) {}

  async execute(accessToken: string): Promise<IUserIdentity> {
    if (!accessToken) {
      this.logger?.warn('Admin authentication rejected', { reason: 'missing_access_token' });
      throw createAdminError(401, 'unauthenticated', 'Login required');
    }

    const user = await this.identityProvider.getUser(accessToken);

    if (!user?.email) {
      this.logger?.warn('Admin authentication rejected', { reason: 'invalid_access_token' });
      throw createAdminError(401, 'unauthenticated', 'Login expired');
    }

    if (!(await this.userAccessPolicy.canAccess(user.email))) {
      this.logger?.warn('Admin authentication rejected', { reason: 'forbidden' });
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    this.logger?.info('Admin authentication completed');

    return user;
  }
}
