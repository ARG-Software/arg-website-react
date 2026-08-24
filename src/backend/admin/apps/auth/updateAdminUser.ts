import { createAdminError } from '../../application/errors.js';

export async function updateAdminUser({ accessToken, name, password }, dependencies) {
  if (!accessToken) {
    throw createAdminError(401, 'unauthenticated', 'Login required');
  }

  const user = await dependencies.identityProvider.getUser(accessToken);

  if (!user?.email || !(await dependencies.adminAccessPolicy.canAccess(user.email))) {
    throw createAdminError(403, 'forbidden', 'Admin access denied');
  }

  const updateData: Record<string, string> = {};

  if (name !== undefined && name.trim() !== (user.name || '')) {
    updateData.name = name.trim();
  }

  if (password) {
    updateData.password = password;
  }

  if (Object.keys(updateData).length === 0) {
    throw createAdminError(400, 'invalid_update', 'No valid update data provided');
  }

  await dependencies.identityProvider.updateUser(accessToken, updateData);
  return { success: true };
}
