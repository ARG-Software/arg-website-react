import assert from 'node:assert/strict';
import test from 'node:test';

import { createAltchaChallenge, verifyAltchaChallenge, verifyAltchaPayload } from '../../security/altcha.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('ALTCHA creates and verifies a solved challenge', async () => {
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

  const challengeResult = await verifyAltchaChallenge({ challenge, solution }, altchaSettings);
  const payloadResult = await verifyAltchaPayload(
    Buffer.from(JSON.stringify({ challenge, solution }), 'utf8').toString('base64'),
    altchaSettings
  );

  assert.equal(challengeResult.verified, true, 'challenge verification should succeed');
  assert.equal(payloadResult.verified, true, 'payload verification should succeed');
});

test('ALTCHA rejects a tampered solution', async () => {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');

  const challenge = await createAltchaChallenge(altchaSettings);
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 30_000 });

  assert.ok(solution);

  const result = await verifyAltchaChallenge(
    { challenge, solution: { ...solution, counter: solution.counter + 999 } },
    altchaSettings
  );

  assert.equal(result.verified, false);
  assert.equal(result.invalidSolution, true);
});
