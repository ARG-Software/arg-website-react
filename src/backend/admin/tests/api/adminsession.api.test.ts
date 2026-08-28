import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthController } from '../../apps/api/controllers/auth.controller.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../apps/http/usersession.cookies.js';

const mockUser = { email: 'admin@arg.software' };
const mockSession = { access_token: 'new-access', refresh_token: 'new-refresh' };

test('GET /api/admin/session returns user info if access token cookie is valid', async () => {
  const controller = createTestController();
  const request = createRequest('GET', { [ACCESS_COOKIE_NAME]: 'valid-token' });
  const response = await controller.getSession(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, mockUser);
});

test('GET /api/admin/session refreshes session and sets new cookies if access token expired', async () => {
  let refreshCalled = false;
  const controller = createTestController({
    getSessionResult: async () => {
        refreshCalled = true;
        return { session: mockSession, user: mockUser };
    },
  });

  const request = createRequest('GET', { [REFRESH_COOKIE_NAME]: 'valid-refresh' });
  const response = await controller.getSession(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, mockUser);
  assert.ok(refreshCalled);

  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => c.startsWith(`${ACCESS_COOKIE_NAME}=new-access`)));
});

test('DELETE /api/admin/session clears cookies and returns 204', async () => {
  const controller = createTestController();
  const request = createRequest('DELETE', { [ACCESS_COOKIE_NAME]: 'valid-token' });
  const response = await controller.signOut(request);

  assert.equal(response.status, 204);
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => c.includes('Max-Age=0')));
});

function createTestController({ getSessionResult = null } = {}) {
  return new AuthController({
    getUserSessionUseCase: {
      execute: getSessionResult || (async () => ({ user: mockUser, session: null })),
    },
    refreshUserSessionUseCase: {
      async execute() {
        return { session: mockSession, user: mockUser };
      },
    },
    secureCookies: false,
    signOutUserUseCase: { execute: async () => {} },
  } as any);
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
