import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthController } from '../../apps/api/controllers/AuthController.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../apps/http/userSessionCookies.js';
import { createAdminError } from '../../application/errors.js';

test('logs in admins through the backend endpoint and sets cookies', async () => {
  const controller = createTestController();
  const response = await controller.login(createLoginRequest());
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
  const controller = createTestController({
    loginError: createAdminError(403, 'bot_verification_failed', 'Verification failed'),
  });
  const response = await controller.login(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
});

test('rate limits admin login attempts before auth', async () => {
  const error = createAdminError(429, 'rate_limited', 'Too many login attempts');
  error.retryAfterSeconds = 60;
  const controller = createTestController({ loginError: error });
  const response = await controller.login(createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(body.error.code, 'rate_limited');
});

function createTestController({ loginError = null } = {}) {
  return new AuthController({
    loginUserUseCase: {
      async execute() {
        if (loginError) throw loginError;

        return {
          session: { access_token: 'access-token', refresh_token: 'refresh-token' },
          user: { email: 'admin@arg.software' },
        };
      },
    },
    secureCookies: false,
  } as any);
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
