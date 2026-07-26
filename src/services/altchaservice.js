import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/pbkdf2';

const CHALLENGE_ENDPOINT = '/.netlify/functions/ask-challenge';
const SOLVE_TIMEOUT_MS = 30_000;

export async function getAltchaPayload() {
  const response = await fetch(CHALLENGE_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Challenge request failed: ${response.status}`);
  }

  const { challenge } = await response.json();

  if (!challenge) {
    throw new Error('No challenge received');
  }

  const solution = await solveChallenge({
    challenge,
    deriveKey,
    timeout: SOLVE_TIMEOUT_MS,
  });

  if (!solution) {
    throw new Error('Challenge solving timed out');
  }

  return { challenge, solution };
}
