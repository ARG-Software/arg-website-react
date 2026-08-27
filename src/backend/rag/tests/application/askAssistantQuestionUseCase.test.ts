import assert from 'node:assert/strict';
import test from 'node:test';

import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askAssistantQuestionUseCase.js';

test('AskAssistantQuestionUseCase requires assistant challenge verification', async () => {
  const useCase = createUseCase();

  await assert.rejects(() => useCase.execute({ clientIp: '203.0.113.10' }), {
    code: 'bot_verification_failed',
    message: 'Verification required',
    statusCode: 403,
  });
});

test('AskAssistantQuestionUseCase rejects failed challenge verification', async () => {
  const useCase = createUseCase({ verified: false });

  await assert.rejects(
    () =>
      useCase.execute({
        altcha: { challenge: 'challenge', solution: 'solution' },
        clientIp: '203.0.113.10',
      }),
    {
      code: 'bot_verification_failed',
      message: 'Verification failed',
      statusCode: 403,
    }
  );
});

test('AskAssistantQuestionUseCase rate limits assistant questions', async () => {
  const useCase = createUseCase({ rateLimitAllowed: false });

  await assert.rejects(
    () =>
      useCase.execute({
        altcha: { challenge: 'challenge', solution: 'solution' },
        clientIp: '203.0.113.10',
      }),
    {
      code: 'rate_limited',
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    }
  );
});

function createUseCase({ verified = true, rateLimitAllowed = true } = {}) {
  return new AskAssistantQuestionUseCase(
    {} as any,
    {
      async verifyChallenge() {
        return { verified };
      },
    },
    {
      config: {
        perMinute: 1,
        perDay: 1,
        globalDaily: 1,
        salt: 'test',
      },
      store: {
        async hit() {
          return { allowed: rateLimitAllowed };
        },
      },
    }
  );
}
