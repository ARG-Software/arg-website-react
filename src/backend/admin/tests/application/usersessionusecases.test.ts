import assert from 'node:assert/strict';
import test from 'node:test';

import { GetUserSessionUseCase } from '../../application/usecases/sessions/getusersession.usecase.js';
import { UpdateUserUseCase } from '../../application/usecases/users/updateuser.usecase.js';

const mockUser = { email: 'admin@arg.software' };
const mockSession = { access_token: 'new-access', refresh_token: 'new-refresh' };

test('getUserSessionUseCase returns user if access token is valid', async () => {
  const useCase = new GetUserSessionUseCase(
    { getUser: async () => mockUser, refreshSession: async () => ({}) } as any,
    { canAccess: async () => true }
  );
  const result = await useCase.execute({ accessToken: 'valid', refreshToken: 'any' });

  assert.deepEqual(result.user, mockUser);
  assert.equal(result.session, null);
});

test('getUserSessionUseCase refreshes session if access token fails but refresh token is valid', async () => {
  let refreshCalled = false;
  const useCase = new GetUserSessionUseCase(
    {
      getUser: async () => null,
      refreshSession: async _token => {
        refreshCalled = true;
        return { session: mockSession, user: mockUser };
      },
    } as any,
    { canAccess: async () => true }
  );
  const result = await useCase.execute({ accessToken: 'expired', refreshToken: 'valid-refresh' });

  assert.ok(refreshCalled);
  assert.deepEqual(result.user, mockUser);
  assert.deepEqual(result.session, mockSession);
});

test('getUserSessionUseCase throws unauthenticated if both tokens are invalid', async () => {
  const useCase = new GetUserSessionUseCase(
    {
      getUser: async () => null,
      refreshSession: async () => ({ error: new Error('invalid') }),
    } as any,
    { canAccess: async () => true }
  );

  await assert.rejects(
    () => useCase.execute({ accessToken: 'bad', refreshToken: 'bad' }),
    { code: 'unauthenticated' }
  );
});

test('updateUserUseCase updates user if data is valid', async () => {
  let updatedData = null;
  const useCase = new UpdateUserUseCase({
    updateUser: async (_token, data) => {
      updatedData = data;
    },
  } as any);

  await useCase.execute({ accessToken: 'valid', user: mockUser, name: 'New Name' });

  assert.deepEqual(updatedData, { name: 'New Name' });
});

test('updateUserUseCase throws validation error if no data provided', async () => {
  const useCase = new UpdateUserUseCase({ updateUser: async () => {} } as any);

  await assert.rejects(
    () => useCase.execute({ accessToken: 'valid', user: mockUser, name: '' }),
    { code: 'invalid_update' }
  );
});
