import { createAdminError } from '../../application/errors.js';
import type { IAdminUserRepository } from '../../application/ports/repositories/IAdminUserRepository.js';
import type { IAdminIdentityProvider } from '../../application/ports/IAdminIdentityProvider.js';

class UserAuthenticator {
  private readonly adminUserRepository: IAdminUserRepository;
  private readonly identityProvider: IAdminIdentityProvider;

  constructor(adminUserRepository: IAdminUserRepository, identityProvider: IdentityProvider) {
    this.adminUserRepository = adminUserRepository;
    this.identityProvider = identityProvider;
  }

  async canAccess(email: string): Promise<boolean> {
    try {
      const canAccess = await this.adminUserRepository.findActiveByEmail(email);
      return canAccess;
    } catch (error) {
      console.error('Error checking admin access policy:', error);
      return false;
    }
  }

  async authenticateUser(token: string) {
    if (!token) {
      throw createAdminError(401, 'unauthenticated', 'Login required');
    }

    const user = await this.identityProvider.getUser(token);

    if (!user?.email) {
      throw createAdminError(401, 'unauthenticated', 'Login expired');
    }

    if (!(await this.canAccess(user.email))) {
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    return user;
  }
}

export { UserAuthenticator };
