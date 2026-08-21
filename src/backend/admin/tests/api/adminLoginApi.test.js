import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminLoginApi } from '../../apps/adminLoginApi.js';

test('logs in admins through the backend endpoint', async () => {
  const api = createTestApi();
  const response = await api(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.session.access_token, 'access-token');
  assert.equal(body.user.email, 'admin@arg.software');
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
