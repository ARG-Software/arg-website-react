import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ALTCHA_HMAC_KEY = 'test-hmac-key-for-testing-only';
process.env.ALTCHA_COST = '100';
process.env.ALTCHA_COUNTER_MIN = '10';
process.env.ALTCHA_COUNTER_MAX = '50';

import { createAltchaChallenge, verifyAltchaChallenge } from '../../infrastructure/security/altcha.js';

test('challenge roundtrip: create, solve, verify', async () => {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');

  const challenge = await createAltchaChallenge();

  assert.ok(challenge.parameters.nonce, 'challenge should have a nonce');
  assert.ok(challenge.signature, 'challenge should be signed');
  assert.equal(challenge.parameters.algorithm, 'PBKDF2/SHA-256');

  const solution = await solveChallenge({
    challenge,
    deriveKey,
    timeout: 30_000,
  });

  assert.ok(solution, 'solution should be found');

  const result = await verifyAltchaChallenge({ challenge, solution });

  assert.equal(result.verified, true, 'verification should succeed');
  assert.equal(result.expired, false);
  assert.equal(result.invalidSignature, false);
  assert.equal(result.invalidSolution, false);
});

test('tampered solution fails verification', async () => {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');

  const challenge = await createAltchaChallenge();
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 30_000 });

  assert.ok(solution);

  const tamperedSolution = { ...solution, counter: solution.counter + 999 };
  const result = await verifyAltchaChallenge({ challenge, solution: tamperedSolution });

  assert.equal(result.verified, false);
  assert.equal(result.invalidSolution, true);
});

test('missing HMAC key throws', async () => {
  const original = process.env.ALTCHA_HMAC_KEY;
  delete process.env.ALTCHA_HMAC_KEY;

  try {
    await assert.rejects(() => createAltchaChallenge(), {
      message: /Missing required environment variable: ALTCHA_HMAC_KEY/,
    });
  } finally {
    process.env.ALTCHA_HMAC_KEY = original;
  }
});
