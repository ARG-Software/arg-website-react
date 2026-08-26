import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserSessionUseCase } from '../../application/usecases/sessions/getUserSessionUseCase.js';
import { updateUserUseCase } from '../../application/usecases/users/updateUserUseCase.js';

const mockUser = { email: 'admin@arg.software' };
const mockSession = { access_token: 'new-access', refresh_token: 'new-refresh' };

test('getUserSessionUseCase returns user if access token is valid', async () => {
  const result = await getUserSessionUseCase(
    { accessToken: 'valid', refreshToken: 'any' },
    {
      identityProvider: { getUser: () => mockUser, refreshSession: () => {} },
      userAccessPolicy: { canAccess: () => true },
    }
  );

  assert.deepEqual(result.user, mockUser);
  assert.equal(result.session, null);
});

test('getUserSessionUseCase refreshes session if access token fails but refresh token is valid', async () => {
  let refreshCalled = false;
  const result = await getUserSessionUseCase(
    { accessToken: 'expired', refreshToken: 'valid-refresh' },
    {
      identityProvider: {
        getUser: () => null,
        refreshSession: _token => {
          refreshCalled = true;
          return { session: mockSession, user: mockUser };
        },
      },
      userAccessPolicy: { canAccess: () => true },
    }
  );

  assert.ok(refreshCalled);
  assert.deepEqual(result.user, mockUser);
  assert.deepEqual(result.session, mockSession);
});

test('getUserSessionUseCase throws unauthenticated if both tokens are invalid', async () => {
  await assert.rejects(
    () =>
      getUserSessionUseCase(
        { accessToken: 'bad', refreshToken: 'bad' },
        {
          identityProvider: {
            getUser: () => null,
            refreshSession: () => ({ error: new Error('invalid') }),
          },
          userAccessPolicy: { canAccess: () => true },
        }
      ),
    { code: 'unauthenticated' }
  );
});

test('updateUserUseCase updates user if data is valid', async () => {
  let updatedData = null;
  await updateUserUseCase(
    { accessToken: 'valid', name: 'New Name' },
    {
      identityProvider: {
        getUser: () => mockUser,
        updateUser: (_token, data) => {
          updatedData = data;
        },
      },
      userAccessPolicy: { canAccess: () => true },
    }
  );

  assert.deepEqual(updatedData, { name: 'New Name' });
});

test('updateUserUseCase throws validation error if no data provided', async () => {
  await assert.rejects(
    () =>
      updateUserUseCase(
        { accessToken: 'valid', name: '' },
        {
          identityProvider: { getUser: () => mockUser },
          userAccessPolicy: { canAccess: () => true },
        }
      ),
    { code: 'invalid_update' }
  );
});
