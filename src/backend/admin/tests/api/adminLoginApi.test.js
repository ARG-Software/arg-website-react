import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminLoginApi } from '../../apps/adminLoginApi.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../infrastructure/http/adminCookies.js';

test('logs in admins through the backend endpoint and sets cookies', async () => {
  const api = createTestApi();
  const response = await api(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.user.email, 'admin@arg.software');

  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => c.startsWith(`${ACCESS_COOKIE_NAME}=access-token`)));
  assert.ok(cookies.some(c => c.startsWith(`${REFRESH_COOKIE_NAME}=refresh-token`)));
  assert.ok(cookies.some(c => c.includes('HttpOnly')));
  assert.ok(cookies.some(c => c.includes('SameSite=Lax')));

  // Ensure tokens are not in the JSON body
  assert.equal(body.session, undefined);
});

test('rejects login when ALTCHA verification fails', async () => {
  const api = createTestApi({ altchaVerified: false });
  const response = await api(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
});

test('rate limits admin login attempts before auth', async () => {
  const api = createTestApi({ rateLimitAllowed: false });
  const response = await api(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(body.error.code, 'rate_limited');
});

function createTestApi({ altchaVerified = true, rateLimitAllowed = true } = {}) {
  return createAdminLoginApi({
    createDependencies: () => ({
      createLoginDependencies: () => ({
        adminAccessPolicy: { canAccess: () => true },
        humanVerification: { verifyPayload: () => ({ verified: altchaVerified }) },
        identityProvider: {
          signInWithPassword: () => ({
            session: { access_token: 'access-token', refresh_token: 'refresh-token' },
            user: { email: 'admin@arg.software' },
          }),
        },
        loginRateLimit: {
          config: { perMinute: 1, perDay: 1, globalDaily: 1, salt: 'test' },
          store: {
            hit: () =>
              rateLimitAllowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 60 },
          },
        },
        env: { NODE_ENV: 'test' },
      }),
    }),
  });
}

function createLoginRequest() {
  return new Request('https://arg.software/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
      'x-nf-client-connection-ip': '127.0.0.1',
    },
    body: JSON.stringify({
      email: 'admin@arg.software',
      password: 'password',
      altcha: 'proof',
    }),
  });
}
