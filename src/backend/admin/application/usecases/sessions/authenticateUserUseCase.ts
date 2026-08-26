import { createAdminError } from '../../errors.js';
import type { IUserIdentityProvider, IUserIdentity } from '../../ports/IUserIdentityProvider.js';
import type { UserAccessPolicy } from '../../policies/userAccessPolicy.js';

export class AuthenticateUserUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly userAccessPolicy: UserAccessPolicy
  ) {}

  async execute(accessToken: string): Promise<IUserIdentity> {
    if (!accessToken) {
      throw createAdminError(401, 'unauthenticated', 'Login required');
    }

    const user = await this.identityProvider.getUser(accessToken);

    if (!user?.email) {
      throw createAdminError(401, 'unauthenticated', 'Login expired');
    }

    if (!(await this.userAccessPolicy.canAccess(user.email))) {
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    return user;
  }
}
