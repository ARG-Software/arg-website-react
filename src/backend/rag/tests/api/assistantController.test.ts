import assert from 'node:assert/strict';
import test from 'node:test';

import { AssistantController } from '../../apps/api/controllers/AssistantController.js';
import { EmbeddingQuotaExceededError } from '../../application/ports/ProviderErrors.js';
import { createAltchaChallenge } from '../../../shared/security/altcha.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('assistant challenge returns the existing wrapped challenge body', async () => {
  const controller = createController();
  const response = await controller.challenge();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.challenge.parameters.algorithm, 'PBKDF2/SHA-256');
});

test('assistant ask passes HTTP payload and client IP to the use case', async () => {
  let input: any;
  const controller = createController({
    async ask(payload) {
      input = payload;
      return createAnswer();
    },
  });
  const response = await controller.ask(await createAskRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(input.clientIp, '203.0.113.10');
  assert.equal(input.question, 'What does ARG build?');
  assert.equal(input.altcha, undefined);
  assert.equal(body.contexts, undefined);
  assert.equal(body.answer, 'ARG builds software products.');
});

test('assistant ask returns invalid_json for malformed request bodies', async () => {
  const controller = createController();
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
  const controller = createController();
  const response = await controller.ask(
    await createAskRequest({ altcha: { challenge: 'challenge', solution: 'solution' } })
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'bot_verification_failed');
  assert.equal(body.error.message, 'Verification failed');
});

test('assistant ask maps embedding quota errors to service unavailable', async () => {
  const controller = createController({
    async ask() {
      throw new EmbeddingQuotaExceededError('test', 'model');
    },
  });
  const response = await controller.ask(await createAskRequest());
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'embedding_quota_exceeded');
  assert.equal(body.error.message, 'Assistant service is temporarily unavailable');
});

test('assistant UI copy reads the language query and returns use case output', async () => {
  const controller = createController();
  const response = await controller.uiCopy(
    new Request('https://arg.software/api/assistant/ui-copy?language=pt')
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.language, 'pt');
});

function createController(options: AssistantUseCases = {}) {
  return new AssistantController(createAssistantUseCases(options), { altchaSettings } as any);
}

function createAssistantUseCases({ ask = async (_payload: any) => createAnswer() }: AssistantUseCases = {}) {
  return {
    askAssistantQuestionUseCase: { execute: ask },
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

async function createAskRequest(overrides: Record<string, unknown> = {}) {
  return new Request('https://arg.software/api/assistant/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nf-client-connection-ip': '203.0.113.10',
    },
    body: JSON.stringify({
      altcha: await createAltchaProof(),
      messages: [],
      pageContext: { pathname: '/', title: 'ARG Software' },
      preferredLanguage: 'en',
      question: 'What does ARG build?',
      ...overrides,
    }),
  });
}

async function createAltchaProof() {
  const { solveChallenge } = await import('altcha-lib');
  const { deriveKey } = await import('altcha-lib/algorithms/pbkdf2');
  const challenge = await createAltchaChallenge(altchaSettings);
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 30_000 });

  assert.ok(solution);

  return { challenge, solution };
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
