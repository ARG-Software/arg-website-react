import { createChallenge, randomInt, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createAltchaChallenge(env = process.env) {
  return createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: getPositiveNumberEnv(env, 'ALTCHA_COST', 2_000),
    counter: randomInt(
      getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MIN', 1_000),
      getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MAX', 3_000)
    ),
    deriveKey,
    hmacSignatureSecret: getAltchaHmacKey(env),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
}

export async function verifyAltchaChallenge(payload, env = process.env) {
  return verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    hmacSignatureSecret: getAltchaHmacKey(env),
    deriveKey,
  });
}

export async function verifyAltchaPayload(payload, env = process.env) {
  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

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

export function getAltchaHmacKey(env = process.env) {
  const key = env.ALTCHA_HMAC_KEY;

  if (!key) {
    throw new Error('Missing required environment variable: ALTCHA_HMAC_KEY');
  }

  return key;
}

function getPositiveNumberEnv(env, name, fallback) {
  const value = Number(env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}
