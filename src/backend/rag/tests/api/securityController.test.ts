import assert from 'node:assert/strict';
import test from 'node:test';

import { SecurityController } from '../../apps/api/controllers/SecurityController.js';
import { createRagError } from '../../application/errors.js';

test('security challenge returns the existing raw challenge body', async () => {
  const controller = new SecurityController(createSecurityUseCases());
  const response = await controller.challenge();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { algorithm: 'PBKDF2/SHA-256' });
});

test('security verify returns verified true when the use case passes', async () => {
  let altcha: unknown;
  const controller = new SecurityController(
    createSecurityUseCases({
      async verify(payload) {
        altcha = payload;
      },
    })
  );
  const response = await controller.verify(createVerifyRequest({ altcha: 'proof' }));

  assert.equal(response.status, 200);
  assert.equal(altcha, 'proof');
  assert.deepEqual(await response.json(), { verified: true });
});

test('security verify maps missing verification errors', async () => {
  const controller = new SecurityController(
    createSecurityUseCases({
      async verify() {
        throw createRagError(403, 'bot_verification_failed', 'Verification required');
      },
    })
  );
  const response = await controller.verify(createVerifyRequest({}));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
  assert.equal(body.error.message, 'Verification required');
});

test('security verify returns invalid_json for malformed request bodies', async () => {
  const controller = new SecurityController(createSecurityUseCases());
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

function createSecurityUseCases({ verify = async (_payload: unknown) => undefined }: SecurityUseCases = {}) {
  return {
    createSecurityChallengeUseCase: {
      async execute() {
        return { algorithm: 'PBKDF2/SHA-256' };
      },
    },
    verifySecurityPayloadUseCase: { execute: verify },
  } as any;
}

interface SecurityUseCases {
  verify?: (payload: unknown) => Promise<void>;
}

function createVerifyRequest(body: unknown) {
  return new Request('https://arg.software/api/security/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
