import assert from 'node:assert/strict';
import test from 'node:test';

import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askAssistantQuestionUseCase.js';

test('AskAssistantQuestionUseCase rate limits assistant questions', async () => {
  const useCase = createUseCase({ rateLimitAllowed: false });

  await assert.rejects(
    () =>
      useCase.execute({
        clientIp: '203.0.113.10',
      }),
    {
      code: 'rate_limited',
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    }
  );
});

function createUseCase({ rateLimitAllowed = true } = {}) {
  return new AskAssistantQuestionUseCase(
    {} as any,
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
