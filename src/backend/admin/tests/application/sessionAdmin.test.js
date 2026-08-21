import assert from 'node:assert/strict';
import test from 'node:test';

import { getAdminSession, updateAdminUser } from '../../application/admin/sessionAdmin.js';

const mockUser = { email: 'admin@arg.software' };
const mockSession = { access_token: 'new-access', refresh_token: 'new-refresh' };

test('getAdminSession returns user if access token is valid', async () => {
  const result = await getAdminSession(
    { accessToken: 'valid', refreshToken: 'any' },
    {
      identityProvider: { getUser: () => mockUser, refreshSession: () => {} },
      adminAccessPolicy: { canAccess: () => true },
    }
  );

  assert.deepEqual(result.user, mockUser);
  assert.equal(result.session, null);
});

test('getAdminSession refreshes session if access token fails but refresh token is valid', async () => {
  let refreshCalled = false;
  const result = await getAdminSession(
    { accessToken: 'expired', refreshToken: 'valid-refresh' },
    {
      identityProvider: {
        getUser: () => null,
        refreshSession: _token => {
          refreshCalled = true;
          return { session: mockSession, user: mockUser };
        },
      },
      adminAccessPolicy: { canAccess: () => true },
    }
  );

  assert.ok(refreshCalled);
  assert.deepEqual(result.user, mockUser);
  assert.deepEqual(result.session, mockSession);
});

test('getAdminSession throws unauthenticated if both tokens are invalid', async () => {
  await assert.rejects(
    () =>
      getAdminSession(
        { accessToken: 'bad', refreshToken: 'bad' },
        {
          identityProvider: {
            getUser: () => null,
            refreshSession: () => ({ error: new Error('invalid') }),
          },
          adminAccessPolicy: { canAccess: () => true },
        }
      ),
    { code: 'unauthenticated' }
  );
});

test('updateAdminUser updates user if data is valid', async () => {
  let updatedData = null;
  await updateAdminUser(
    { accessToken: 'valid', name: 'New Name' },
    {
      identityProvider: {
        getUser: () => mockUser,
        updateUser: (_token, data) => {
          updatedData = data;
        },
      },
      adminAccessPolicy: { canAccess: () => true },
    }
  );

  assert.deepEqual(updatedData, { name: 'New Name' });
});

test('updateAdminUser throws validation error if no data provided', async () => {
  await assert.rejects(
    () =>
      updateAdminUser(
        { accessToken: 'valid', name: '' },
        {
          identityProvider: { getUser: () => mockUser },
          adminAccessPolicy: { canAccess: () => true },
        }
      ),
    { code: 'invalid_update' }
  );
});
