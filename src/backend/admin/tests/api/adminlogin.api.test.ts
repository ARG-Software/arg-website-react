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

function createTestController({ rateLimitResult = { allowed: true }, onLogin = () => {} } = {}) {
  return new AuthController({
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
  } as any);
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
