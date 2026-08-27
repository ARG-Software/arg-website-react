import assert from 'node:assert/strict';
import test from 'node:test';

import { SecurityController } from '../../apps/api/controllers/security.controller.js';
import { createAltchaChallenge } from '../../../shared/security/altcha.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('security challenge returns the existing raw challenge body', async () => {
  const controller = createController();
  const response = await controller.challenge();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.parameters.algorithm, 'PBKDF2/SHA-256');
});

test('security verify returns verified true when the use case passes', async () => {
  const controller = createController();
  const response = await controller.verify(createVerifyRequest({ altcha: await createAltchaPayload() }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { verified: true });
});

test('security verify maps missing verification errors', async () => {
  const controller = createController();
  const response = await controller.verify(createVerifyRequest({}));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
  assert.equal(body.error.message, 'Verification required');
});

test('security verify returns invalid_json for malformed request bodies', async () => {
  const controller = createController();
  const response = await controller.verify(
    new Request('https://arg.software/api/security/verify', {
      method: 'POST',
      body: '{',
    })
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_json');
});

function createController() {
  return new SecurityController({ altchaSettings } as any);
}

function createVerifyRequest(body: unknown) {
  return new Request('https://arg.software/api/security/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
