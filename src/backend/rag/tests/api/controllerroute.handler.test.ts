import assert from 'node:assert/strict';
import test from 'node:test';

import { dispatchControllerRoutes } from '../../apps/api/controllerroute.handler.js';

test('dispatchControllerRoutes calls the matching RAG controller route and adds CORS headers', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/assistant/example'), [
    {
      method: 'GET',
      path: '/api/assistant/example',
      handler: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    },
  ]);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
  assert.deepEqual(await response.json(), { ok: true });
});

test('dispatchControllerRoutes returns 404 for unknown RAG paths', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/assistant/missing'), []);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'not_found');
});

test('dispatchControllerRoutes returns 405 with RAG path-specific allowed methods', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/assistant/example', 'POST'), [
    {
      method: 'GET',
      path: '/api/assistant/example',
      handler: async () => new Response(null, { status: 204 }),
    },
  ]);
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'OPTIONS, GET');
  assert.equal(body.error.code, 'method_not_allowed');
});

test('dispatchControllerRoutes handles RAG OPTIONS before controller methods', async () => {
  let called = false;
  const response = await dispatchControllerRoutes(createRequest('/api/assistant/example', 'OPTIONS'), [
    {
      method: 'GET',
      path: '/api/assistant/example',
      handler: async () => {
        called = true;
        return new Response(null, { status: 204 });
      },
    },
  ]);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'OPTIONS, GET');
  assert.equal(called, false);
});

test('dispatchControllerRoutes rejects disallowed RAG origins', async () => {
  const response = await dispatchControllerRoutes(
    createRequest('/api/assistant/example', 'GET', 'https://evil.example'),
    [
      {
        method: 'GET',
        path: '/api/assistant/example',
        handler: async () => new Response(null, { status: 204 }),
      },
    ]
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'origin_not_allowed');
});

function createRequest(path: string, method = 'GET', origin = 'https://arg.software') {
  return new Request(`https://arg.software${path}`, {
    method,
    headers: { Origin: origin },
  });
}
