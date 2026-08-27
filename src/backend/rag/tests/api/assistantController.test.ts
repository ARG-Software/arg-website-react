import assert from 'node:assert/strict';
import test from 'node:test';

import { AssistantController } from '../../apps/api/controllers/AssistantController.js';
import { createRagError } from '../../application/errors.js';
import { EmbeddingQuotaExceededError } from '../../application/ports/ProviderErrors.js';

test('assistant challenge returns the existing wrapped challenge body', async () => {
  const controller = new AssistantController(createAssistantUseCases());
  const response = await controller.challenge();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { challenge: { algorithm: 'PBKDF2/SHA-256' } });
});

test('assistant ask passes HTTP payload and client IP to the use case', async () => {
  let input: any;
  const controller = new AssistantController(
    createAssistantUseCases({
      async ask(payload) {
        input = payload;
        return createAnswer();
      },
    })
  );
  const response = await controller.ask(createAskRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(input.clientIp, '203.0.113.10');
  assert.equal(input.question, 'What does ARG build?');
  assert.deepEqual(input.altcha, { challenge: 'challenge', solution: 'solution' });
  assert.equal(body.contexts, undefined);
  assert.equal(body.answer, 'ARG builds software products.');
});

test('assistant ask returns invalid_json for malformed request bodies', async () => {
  const controller = new AssistantController(createAssistantUseCases());
  const response = await controller.ask(
    new Request('https://arg.software/api/assistant/ask', {
      method: 'POST',
      body: '{',
    })
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_json');
});

test('assistant ask maps bot verification errors', async () => {
  const controller = new AssistantController(
    createAssistantUseCases({
      async ask() {
        throw createRagError(403, 'bot_verification_failed', 'Verification failed');
      },
    })
  );
  const response = await controller.ask(createAskRequest());
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
  assert.equal(body.error.message, 'Verification failed');
});

test('assistant ask maps embedding quota errors to service unavailable', async () => {
  const controller = new AssistantController(
    createAssistantUseCases({
      async ask() {
        throw new EmbeddingQuotaExceededError('test', 'model');
      },
    })
  );
  const response = await controller.ask(createAskRequest());
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'embedding_quota_exceeded');
  assert.equal(body.error.message, 'Assistant service is temporarily unavailable');
});

test('assistant UI copy reads the language query and returns use case output', async () => {
  const controller = new AssistantController(createAssistantUseCases());
  const response = await controller.uiCopy(
    new Request('https://arg.software/api/assistant/ui-copy?language=pt')
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.language, 'pt');
});

function createAssistantUseCases({ ask = async (_payload: any) => createAnswer() }: AssistantUseCases = {}) {
  return {
    askAssistantQuestionUseCase: { execute: ask },
    createAssistantChallengeUseCase: {
      async execute() {
        return { algorithm: 'PBKDF2/SHA-256' };
      },
    },
    getAssistantUiCopyUseCase: {
      async execute(language: string) {
        return { language };
      },
    },
  } as any;
}

interface AssistantUseCases {
  ask?: (payload: any) => Promise<any>;
}

function createAskRequest() {
  return new Request('https://arg.software/api/assistant/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nf-client-connection-ip': '203.0.113.10',
    },
    body: JSON.stringify({
      altcha: { challenge: 'challenge', solution: 'solution' },
      messages: [],
      pageContext: { pathname: '/', title: 'ARG Software' },
      preferredLanguage: 'en',
      question: 'What does ARG build?',
    }),
  });
}

function createAnswer() {
  return {
    answer: 'ARG builds software products.',
    language: 'en',
    languagePreference: undefined,
    citations: [],
    articleRecommendations: [],
    actions: [],
    contexts: [{ hidden: true }],
  };
}
