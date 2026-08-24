import assert from 'node:assert/strict';
import test from 'node:test';

import { createAltchaChallenge, verifyAltchaChallenge } from '../../infrastructure/security/altcha.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('challenge roundtrip: create, solve, verify', async () => {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');

  const challenge = await createAltchaChallenge(altchaSettings);

  assert.ok(challenge.parameters.nonce, 'challenge should have a nonce');
  assert.ok(challenge.signature, 'challenge should be signed');
  assert.equal(challenge.parameters.algorithm, 'PBKDF2/SHA-256');

  const solution = await solveChallenge({
    challenge,
    deriveKey,
    timeout: 30_000,
  });

  assert.ok(solution, 'solution should be found');

  const result = await verifyAltchaChallenge({ challenge, solution }, altchaSettings);

  assert.equal(result.verified, true, 'verification should succeed');
  assert.equal(result.expired, false);
  assert.equal(result.invalidSignature, false);
  assert.equal(result.invalidSolution, false);
});

test('tampered solution fails verification', async () => {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');

  const challenge = await createAltchaChallenge(altchaSettings);
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 30_000 });

  assert.ok(solution);

  const tamperedSolution = { ...solution, counter: solution.counter + 999 };
  const result = await verifyAltchaChallenge(
    { challenge, solution: tamperedSolution },
    altchaSettings
  );

  assert.equal(result.verified, false);
  assert.equal(result.invalidSolution, true);
});

