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
    private readonly userAccessPolicy: UserAccessPolicy
  ) {}

  async execute(tokens: { accessToken?: string; refreshToken?: string }): Promise<{
    user: IUserIdentity;
    session: IUserSession | null;
  }> {
    const { accessToken, refreshToken } = tokens;

    if (accessToken) {
      const user = await this.identityProvider.getUser(accessToken);

      if (user?.email && (await this.userAccessPolicy.canAccess(user.email))) {
        return { user, session: null };
      }
    }

    if (refreshToken) {
      const result = await this.identityProvider.refreshSession(refreshToken);

      if (
        !result.error &&
        result.session &&
        result.user?.email &&
        (await this.userAccessPolicy.canAccess(result.user.email))
      ) {
        return {
          user: result.user,
          session: result.session,
        };
      }
    }

    throw createAdminError(401, 'unauthenticated', 'Login expired');
  }
}
