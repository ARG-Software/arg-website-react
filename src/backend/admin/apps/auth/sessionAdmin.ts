import { createAdminError } from '../../application/errors.ts';
import { IdentityProvider } from '../../application/ports/IAdminIdentityProvider.ts';


export class UserSession{

  private readonly identityProvider: IdentityProvider;

  constructor(identityProvider: IdentityProvider) {
    this.identityProvider = identityProvider;

  }

 async getAdminSession(tokens: { accessToken?: string; refreshToken?: string }) {
  const { accessToken, refreshToken } = tokens;

  if (accessToken) {
    const user = await this.identityProvider.getUser(accessToken);

    if (user?.email) {
      if (await dependencies.adminAccessPolicy.canAccess(user.email)) {
      return { user, session: null };
    }
    }
  }

  if (refreshToken) {
    const result = await dependencies.identityProvider.refreshSession(refreshToken);

    if (!result.error && result.session && result.user?.email) {
      if (await dependencies.adminAccessPolicy.canAccess(result.user.email)) {
        return {
          user: result.user,
          session: result.session,
        };
      }
    }
  }


  throw createAdminError(401, 'unauthenticated', 'Login expired');
  }

  async refreshAdminSession(refreshToken) {
  if (!refreshToken) {
    throw createAdminError(401, 'unauthenticated', 'Refresh token required');
  }

  const result = await this.identityProvider.refreshSession(refreshToken);

  if (result.error || !result.session || !result.user?.email) {
    throw createAdminError(401, 'unauthenticated', 'Refresh token expired');
  }

  if (!(await dependencies.adminAccessPolicy.canAccess(result.user.email))) {
    throw createAdminError(403, 'forbidden', 'Admin access denied');
  }

  return {
    session: result.session,
    user: result.user,
  };
}


}

export async function signOutAdmin(accessToken, dependencies) {
  await dependencies.identityProvider.signOut(accessToken);
}

}


