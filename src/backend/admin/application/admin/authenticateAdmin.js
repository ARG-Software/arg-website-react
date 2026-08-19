import { createAdminError } from '../errors.js';

export async function authenticateAdmin(token, { adminAccessPolicy, identityProvider }) {
  if (!token) {
    throw createAdminError(401, 'unauthenticated', 'Login required');
  }

  const user = await identityProvider.getUser(token);

  if (!user?.email) {
    throw createAdminError(401, 'unauthenticated', 'Login expired');
  }

  if (!adminAccessPolicy.canAccess(user.email)) {
    throw createAdminError(403, 'forbidden', 'Admin access denied');
  }

  return user;
}
