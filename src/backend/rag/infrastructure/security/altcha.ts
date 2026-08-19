import { createChallenge, randomInt, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import type { Challenge, Solution, VerifySolutionResult } from 'altcha-lib';
import type { EnvSource } from '../../config/env.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.02;

interface StoredChallenge {
  challenge: Challenge;
  expiresAt: number;
}

const challengeStore = new Map<string, StoredChallenge>();

function maybeCleanup(): void {
  if (Math.random() > CLEANUP_PROBABILITY) {
    return;
  }

  const now = Date.now();

  for (const [key, entry] of challengeStore) {
    if (entry.expiresAt <= now) {
      challengeStore.delete(key);
    }
  }
}

function getAltchaCost(env: EnvSource): number {
  const value = Number(env.ALTCHA_COST);
  return Number.isFinite(value) && value > 0 ? value : 2_000;
}

function getAltchaCounterMin(env: EnvSource): number {
  const value = Number(env.ALTCHA_COUNTER_MIN);
  return Number.isFinite(value) && value > 0 ? value : 1_000;
}

function getAltchaCounterMax(env: EnvSource): number {
  const value = Number(env.ALTCHA_COUNTER_MAX);
  return Number.isFinite(value) && value > 0 ? value : 3_000;
}

export async function createAltchaChallenge(env: EnvSource = process.env): Promise<Challenge> {
  const hmacKey = getAltchaHmacKey(env);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  const challenge = await createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: getAltchaCost(env),
    counter: randomInt(getAltchaCounterMin(env), getAltchaCounterMax(env)),
    deriveKey,
    hmacSignatureSecret: hmacKey,
    expiresAt,
  });

  const nonce = challenge.parameters.nonce;

  challengeStore.set(nonce, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  maybeCleanup();

  return challenge;
}

export async function verifyAltchaChallenge(payload: {
  challenge: Challenge;
  solution: Solution;
}, env: EnvSource = process.env): Promise<VerifySolutionResult> {
  const hmacKey = getAltchaHmacKey(env);
  const nonce = payload.challenge?.parameters?.nonce;

  if (nonce) {
    challengeStore.delete(nonce);
  }

  return verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    hmacSignatureSecret: hmacKey,
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
