import assert from 'node:assert/strict';
import test from 'node:test';

import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askassistantquestion.usecase.js';

test('AskAssistantQuestionUseCase delegates assistant questions without rate limiting', async () => {
  const useCase = new AskAssistantQuestionUseCase({
    config: {} as any,
    readRepository: {} as any,
    embeddingProvider: {} as any,
    fallbackEmbeddingProvider: {} as any,
    answerProvider: {
      async classifyQuestionIntent() {
        return { intent: 'small_talk', response: 'Hello from Gaspar.', language: 'en' };
      },
    } as any,
  });

  const result = await useCase.execute({ question: 'Hi', messages: [] });

  assert.equal(result.answer, 'Hello from Gaspar.');
});
