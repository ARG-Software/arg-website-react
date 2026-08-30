import assert from 'node:assert/strict';
import test from 'node:test';

import { getControllerRoutes } from '../../../shared/api/decorators/index.js';
import { createAltchaChallenge } from '../../../shared/security/altcha.js';
import { dispatchControllerRoutes } from '../../apps/api/controllerroute.handler.js';
import { AssistantController } from '../../apps/api/controllers/assistant.controller.js';
import { SecurityController } from '../../apps/api/controllers/security.controller.js';

const altchaSettings = {
  altchaHmacKey: 'test-hmac-key-for-testing-only',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
};

test('RAG controller composition exposes assistant and security routes', () => {
  const routeKeys = getRoutes().map(route => `${route.method} ${route.path}`);

  assert.deepEqual(routeKeys, [
    'GET /api/assistant/challenge',
    'POST /api/assistant/ask',
    'GET /api/assistant/ui-copy',
    'GET /api/security/challenge',
    'POST /api/security/verify',
  ]);
});

test('RAG controller composition handles OPTIONS through the shared dispatcher', async () => {
  const response = await dispatchControllerRoutes(
    createRequest('/api/assistant/ask', { method: 'OPTIONS' }),
    getRoutes()
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'OPTIONS, POST');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
});

test('RAG controller composition dispatches assistant ask without exposing contexts', async () => {
  let input: any;
  let rateLimitChecked = false;
  const routes = getRoutes({
    async ask(payload) {
      input = payload;
      return {
        answer: 'ARG builds fintech and media platforms.',
        language: 'en',
        citations: [],
        articleRecommendations: [],
        actions: [],
        contexts: [{ hidden: true }],
      };
    },
    async checkRateLimit() {
      rateLimitChecked = true;
      return { allowed: true };
    },
  });
  const response = await dispatchControllerRoutes(
    createRequest('/api/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({
        altcha: await createAltchaProof(),
        messages: [{ role: 'user', content: 'Previous question' }],
        pageContext: { pathname: '/', title: 'ARG Software' },
        preferredLanguage: 'en',
        question: 'What does ARG build?',
      }),
    }),
    routes
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rateLimitChecked, true);
  assert.equal(input.question, 'What does ARG build?');
  assert.equal(input.altcha, undefined);
  assert.equal(body.answer, 'ARG builds fintech and media platforms.');
  assert.equal(body.contexts, undefined);
});

function getRoutes(options: RouteOptions = {}) {
  const assistantController = new AssistantController(
    {
      askAssistantQuestionUseCase: {
        execute: options.ask || (async () => ({
          answer: 'Answer',
          language: 'en',
          citations: [],
          articleRecommendations: [],
          actions: [],
          contexts: [],
        })),
      },
      getAssistantUiCopyUseCase: {
        execute: async (language: string) => ({ language }),
      },
      retrieveRelevantChunksUseCase: {
        execute: async () => [],
      },
    } as any,
    {
      altchaSettings,
      askRateLimiter: {
        check: options.checkRateLimit || (async () => ({ allowed: true })),
      },
    } as any
  );
  const securityController = new SecurityController({ altchaSettings } as any);

  return [
    ...getControllerRoutes(assistantController),
    ...getControllerRoutes(securityController),
  ];
}

interface RouteOptions {
  ask?: (payload: any) => Promise<any>;
  checkRateLimit?: () => Promise<any>;
}

function createRequest(
  path: string,
  options: { method?: string; body?: string } = {}
) {
  return new Request(`https://arg.software${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
      'x-nf-client-connection-ip': '203.0.113.10',
    },
    body: options.body,
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
