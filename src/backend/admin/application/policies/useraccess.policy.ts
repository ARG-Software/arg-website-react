import type { IAdminUserRepository } from '../ports/repositories/iadminuser.repository.js';

export type UserAccessPolicy = {
  canAccess(email: string): Promise<boolean>;
};

export function createUserAccessPolicy(adminUserRepository: IAdminUserRepository): UserAccessPolicy {
  return {
    async canAccess(email: string): Promise<boolean> {
      try {
        return Boolean(await adminUserRepository.findActiveByEmail(email));
      } catch (error) {
        console.error('Error checking user access policy:', error);
        return false;
      }
    },
  };
}
