import { createChallenge, randomInt, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import type { Challenge, Solution, VerifySolutionResult } from 'altcha-lib';

export type AltchaSettings = {
  altchaHmacKey: string;
  altchaCost: number;
  altchaCounterMin: number;
  altchaCounterMax: number;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createAltchaChallenge(settings: AltchaSettings): Promise<Challenge> {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  return createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: settings.altchaCost,
    counter: randomInt(settings.altchaCounterMin, settings.altchaCounterMax),
    deriveKey,
    hmacSignatureSecret: settings.altchaHmacKey,
    expiresAt,
  });
}

export async function verifyAltchaChallenge(
  payload: { challenge: Challenge; solution: Solution },
  settings: Pick<AltchaSettings, 'altchaHmacKey'>
): Promise<VerifySolutionResult> {
  return verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    hmacSignatureSecret: settings.altchaHmacKey,
    deriveKey,
  });
}

export async function verifyAltchaPayload(
  payload: string,
  settings: Pick<AltchaSettings, 'altchaHmacKey'>
): Promise<VerifySolutionResult> {
  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as {
    challenge?: Challenge;
    solution?: Solution;
  };

  if (!decodedPayload.challenge || !decodedPayload.solution) {
    throw new Error('ALTCHA payload is invalid');
  }

  return verifyAltchaChallenge(
    {
      challenge: decodedPayload.challenge,
      solution: decodedPayload.solution,
    },
    settings
  );
}
