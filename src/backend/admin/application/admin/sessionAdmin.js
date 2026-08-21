import { createAdminError } from '../errors.js';

export async function getAdminSession(tokens, dependencies) {
  const { accessToken, refreshToken } = tokens;

  if (accessToken) {
    const user = await dependencies.identityProvider.getUser(accessToken);

    if (user?.email && (await dependencies.adminAccessPolicy.canAccess(user.email))) {
      return { user, session: null };
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

export async function refreshAdminSession(refreshToken, dependencies) {
  if (!refreshToken) {
    throw createAdminError(401, 'unauthenticated', 'Refresh token required');
  }

  const result = await dependencies.identityProvider.refreshSession(refreshToken);

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

export async function signOutAdmin(accessToken, dependencies) {
  await dependencies.identityProvider.signOut(accessToken);
}

export async function updateAdminUser({ accessToken, name, password }, dependencies) {
  if (!accessToken) {
    throw createAdminError(401, 'unauthenticated', 'Login required');
  }

  const user = await dependencies.identityProvider.getUser(accessToken);

  if (!user?.email || !(await dependencies.adminAccessPolicy.canAccess(user.email))) {
    throw createAdminError(403, 'forbidden', 'Admin access denied');
  }

  const updateData = {};

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
