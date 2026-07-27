import { solveChallengeWorkers } from 'altcha-lib';
import AltchaPbkdf2Worker from '../workers/altchaPbkdf2Worker.js?worker';

const CHALLENGE_ENDPOINT = '/.netlify/functions/ask-challenge';
const SOLVE_TIMEOUT_MS = 60_000;

let preparedPayload = null;
let preparingPromise = null;

function getProofExpiresAt(challenge) {
  const expiresAt = challenge?.parameters?.expiresAt;

  return typeof expiresAt === 'number' ? expiresAt * 1000 : Date.now() + 5 * 60 * 1000;
}

function isProofValid(proof) {
  if (!proof || !proof.challenge) return false;
  return Date.now() < getProofExpiresAt(proof.challenge);
}

async function fetchAndSolveChallenge() {
  const response = await fetch(CHALLENGE_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Challenge request failed: ${response.status}`);
  }

  const { challenge } = await response.json();

  if (!challenge) {
    throw new Error('No challenge received');
  }

  const solution = await solveChallengeWorkers({
    challenge,
    concurrency: Math.min(navigator.hardwareConcurrency || 2, 4),
    createWorker: () => new AltchaPbkdf2Worker(),
    timeout: SOLVE_TIMEOUT_MS,
  });

  if (!solution) {
    throw new Error('Challenge solving timed out');
  }

  return { challenge, solution };
}

export async function prepareAltchaPayload() {
  if (isProofValid(preparedPayload)) {
    return preparedPayload;
  }

  if (!preparingPromise) {
    preparingPromise = fetchAndSolveChallenge()
      .then(payload => {
        preparedPayload = payload;
        return payload;
      })
      .finally(() => {
        preparingPromise = null;
      });
  }

  return preparingPromise;
}

export async function getAltchaPayload() {
  if (isProofValid(preparedPayload)) {
    return preparedPayload;
  }

  return prepareAltchaPayload();
}

export function consumeAltchaPayload() {
  preparedPayload = null;
  preparingPromise = null;
}
