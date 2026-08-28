import type { ILogger } from '../../../shared/logger/ilogger.js';
import type { IAdminUserRepository } from '../ports/repositories/iadminuser.repository.js';

export type UserAccessPolicy = {
  canAccess(email: string): Promise<boolean>;
};

export function createUserAccessPolicy(
  adminUserRepository: IAdminUserRepository,
  logger?: ILogger
): UserAccessPolicy {
  return {
    async canAccess(email: string): Promise<boolean> {
      try {
        return Boolean(await adminUserRepository.findActiveByEmail(email));
      } catch (error) {
        logger?.error('User access policy check failed', { error });
        return false;
      }
    },
  };
}
