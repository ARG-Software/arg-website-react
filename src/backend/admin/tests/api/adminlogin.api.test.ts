import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthController } from '../../apps/api/controllers/auth.controller.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../apps/http/usersession.cookies.js';
import { createAltchaChallenge } from '../../../shared/security/altcha.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('logs in admins through the backend endpoint and sets cookies', async () => {
  const controller = createTestController();
  const response = await controller.login(await createLoginRequest());
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
  const controller = createTestController();
  const response = await controller.login(await createLoginRequest({ altcha: 'proof' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
});

test('rate limits admin login attempts before auth', async () => {
  let loginCalled = false;
  const controller = createTestController({
    rateLimitResult: { allowed: false, retryAfterSeconds: 60 },
    onLogin: () => {
      loginCalled = true;
    },
  });
  const response = await controller.login(await createLoginRequest());
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(body.error.code, 'rate_limited');
  assert.equal(loginCalled, false);
});

test('notifies when admin login rate limit is reached', async () => {
  const notifications: any[] = [];
  const controller = createTestController({
    rateLimitResult: { allowed: false, retryAfterSeconds: 60, scope: 'minute' },
    notificationProvider: {
      async send(message) {
        notifications.push(message);
      },
    },
  });
  const response = await controller.login(await createLoginRequest());

  assert.equal(response.status, 429);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'Admin login rate limit reached');
  assert.deepEqual(notifications[0].fields.slice(0, 3), [
    { name: 'Endpoint', value: '/api/admin/login' },
    { name: 'Client IP', value: '127.0.0.1' },
    { name: 'Scope', value: 'minute' },
  ]);
  assert.deepEqual(notifications[0].fields.slice(3, 4), [
    { name: 'Retry after', value: '60s' },
  ]);
});

test('does not notify when admin login rate limit allows the request', async () => {
  let notified = false;
  const controller = createTestController({
    notificationProvider: {
      async send() {
        notified = true;
      },
    },
  });

  await controller.login(await createLoginRequest());

  assert.equal(notified, false);
});

function createTestController({
  rateLimitResult = { allowed: true },
  onLogin = () => {},
  notificationProvider = { send: async () => {} },
}: any = {}) {
  return new AuthController({
    authenticateUserUseCase: createAuthenticateUserUseCase(),
    altchaSettings,
    loginRateLimiter: {
      async check() {
        return rateLimitResult;
      },
    },
    loginUserUseCase: {
      async execute(input) {
        onLogin();

        assert.equal(input.altcha, undefined);

        return {
          session: { access_token: 'access-token', refresh_token: 'refresh-token' },
          user: { email: 'admin@arg.software' },
        };
      },
    },
    secureCookies: false,
  } as any, notificationProvider);
}

function createAuthenticateUserUseCase() {
  return { execute: async () => ({ email: 'admin@arg.software' }) } as any;
}

async function createLoginRequest(overrides: Record<string, unknown> = {}) {
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
      altcha: await createAltchaPayload(),
      ...overrides,
    }),
  });
}

async function createAltchaPayload() {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');
  const challenge = await createAltchaChallenge(altchaSettings);
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 30_000 });

  assert.ok(solution);

  return Buffer.from(JSON.stringify({ challenge, solution }), 'utf8').toString('base64');
}
