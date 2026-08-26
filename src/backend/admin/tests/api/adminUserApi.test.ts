import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminUserApi } from '../../apps/adminApi.js';
import { ACCESS_COOKIE_NAME } from '../../apps/http/userSessionCookies.js';

test('PATCH /api/admin/user updates user name', async () => {
  let updatedData = null;
  const api = createTestApi({
    identityProvider: {
      getUser: () => ({ email: 'admin@arg.software' }),
      updateUser: (token, data) => {
        updatedData = data;
      },
    },
  });

  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ name: 'New Name' }),
  });

  const response = await api(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.success);
  assert.deepEqual(updatedData, { name: 'New Name' });
});

test('PATCH /api/admin/user updates password', async () => {
  let updatedData = null;
  const api = createTestApi({
    identityProvider: {
      getUser: () => ({ email: 'admin@arg.software' }),
      updateUser: (token, data) => {
        updatedData = data;
      },
    },
  });

  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ password: 'new-secret' }),
  });

  const response = await api(request);
  assert.equal(response.status, 200);
  assert.deepEqual(updatedData, { password: 'new-secret' });
});

test('PATCH /api/admin/user returns 400 if no valid data', async () => {
  const api = createTestApi();
  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ name: '' }),
  });

  const response = await api(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_update');
});

function createTestApi(overrides = {}) {
  return createAdminUserApi({
    createDependencies: () => ({
      createSessionDependencies: () => ({
        userAccessPolicy: { canAccess: () => true },
        identityProvider: {
          getUser: () => ({ email: 'admin@arg.software' }),
          updateUser: () => {},
          ...overrides.identityProvider,
        },
      }),
    }),
    env: { NODE_ENV: 'test' },
  });
}
