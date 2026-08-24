import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminSessionApi } from '../../apps/adminSessionApi.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../infrastructure/http/adminCookies.js';

const mockUser = { email: 'admin@arg.software' };
const mockSession = { access_token: 'new-access', refresh_token: 'new-refresh' };

test('GET /api/admin/session returns user info if access token cookie is valid', async () => {
  const api = createTestApi();
  const request = createRequest('GET', { [ACCESS_COOKIE_NAME]: 'valid-token' });
  const response = await api(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, mockUser);
});

test('GET /api/admin/session refreshes session and sets new cookies if access token expired', async () => {
  let refreshCalled = false;
  const api = createTestApi({
    identityProvider: {
      getUser: () => null,
      refreshSession: _token => {
        refreshCalled = true;
        return { session: mockSession, user: mockUser };
      },
    },
  });

  const request = createRequest('GET', { [REFRESH_COOKIE_NAME]: 'valid-refresh' });
  const response = await api(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, mockUser);
  assert.ok(refreshCalled);

  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => c.startsWith(`${ACCESS_COOKIE_NAME}=new-access`)));
});

test('DELETE /api/admin/session clears cookies and returns 204', async () => {
  const api = createTestApi();
  const request = createRequest('DELETE', { [ACCESS_COOKIE_NAME]: 'valid-token' });
  const response = await api(request);

  assert.equal(response.status, 204);
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => c.includes('Max-Age=0')));
});

function createTestApi(overrides = {}) {
  return createAdminSessionApi({
    createDependencies: () => ({
      createSessionDependencies: () => ({
        adminAccessPolicy: { canAccess: () => true },
        identityProvider: {
          getUser: () => mockUser,
          refreshSession: () => ({ session: mockSession, user: mockUser }),
          signOut: () => {},
          ...overrides.identityProvider,
        },
      }),
    }),
    env: { NODE_ENV: 'test' },
  });
}

function createRequest(method, cookies = {}) {
  const cookieString = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return new Request('https://arg.software/api/admin/session', {
    method,
    headers: {
      Origin: 'https://arg.software',
      Cookie: cookieString,
    },
  });
}
