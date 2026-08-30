import assert from 'node:assert/strict';
import test from 'node:test';

import { createFakeAnswerProvider } from '../fakes/fakeanswer.provider.js';
import { createFakeEmbeddingProvider } from '../fakes/fakeembedding.provider.js';
import { createAssistantUseCases } from '../fakes/createassistantusecases.js';
import { FakeRagReadRepository } from '../fakes/fakeragread.repository.js';
import { createTestConfig } from '../fixtures/config.js';

test('AskAssistantQuestionUseCase delegates assistant questions without rate limiting', async () => {
  const embeddingProvider = createFakeEmbeddingProvider(() => []);
  const useCases = createAssistantUseCases({
    config: createTestConfig(),
    readRepository: new FakeRagReadRepository(),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
    answerProvider: createFakeAnswerProvider('unused', {
      intent: 'small_talk',
      intentResponse: 'Hello from Gaspar.',
    }),
  });

  const result = await useCases.askAssistantQuestionUseCase.execute({ question: 'Hi', messages: [] });

  assert.equal(result.answer, 'Hello from Gaspar.');
});
