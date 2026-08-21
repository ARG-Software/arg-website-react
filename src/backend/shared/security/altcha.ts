import { createChallenge, randomInt, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import type { Challenge, Solution, VerifySolutionResult } from 'altcha-lib';

export type EnvSource = Record<string, string | undefined>;

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createAltchaChallenge(env: EnvSource = process.env): Promise<Challenge> {
  const hmacKey = getAltchaHmacKey(env);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  return createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: getPositiveNumberEnv(env, 'ALTCHA_COST', 2_000),
    counter: randomInt(
      getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MIN', 1_000),
      getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MAX', 3_000)
    ),
    deriveKey,
    hmacSignatureSecret: hmacKey,
    expiresAt,
  });
}

export async function verifyAltchaChallenge(
  payload: { challenge: Challenge; solution: Solution },
  env: EnvSource = process.env
): Promise<VerifySolutionResult> {
  return verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    hmacSignatureSecret: getAltchaHmacKey(env),
    deriveKey,
  });
}

export async function verifyAltchaPayload(
  payload: string,
  env: EnvSource = process.env
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
    env
  );
}

export function getAltchaHmacKey(env: EnvSource = process.env): string {
  const key = env.ALTCHA_HMAC_KEY;

  if (!key) {
    throw new Error('Missing required environment variable: ALTCHA_HMAC_KEY');
  }

  return key;
}

function getPositiveNumberEnv(env: EnvSource, name: string, fallback: number): number {
  const value = Number(env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}
