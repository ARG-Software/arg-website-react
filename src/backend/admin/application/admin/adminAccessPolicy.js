export function createAdminAccessPolicy(adminUserRepository) {
  return {
    async canAccess(email) {
      return Boolean(await adminUserRepository.findActiveByEmail(email));
    },
  };
}
