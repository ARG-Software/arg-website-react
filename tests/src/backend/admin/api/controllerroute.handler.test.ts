import assert from 'node:assert/strict';
import test from 'node:test';

import { dispatchControllerRoutes } from '../../../../../src/backend/admin/apps/api/controllerroute.handler.js';

test('dispatchControllerRoutes calls the matching controller route and adds CORS headers', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/admin/example'), [
    {
      method: 'GET',
      path: '/api/admin/example',
      handler: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    },
  ]);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Pragma'), 'no-cache');
  assert.match(response.headers.get('X-Request-ID') || '', /.+/);
  assert.deepEqual(await response.json(), { ok: true });
});

test('dispatchControllerRoutes uses incoming request id for response correlation', async () => {
  const response = await dispatchControllerRoutes(
    createRequest('/api/admin/example', 'GET', 'https://arg.software', 'req-existing'),
    [
      {
        method: 'GET',
        path: '/api/admin/example',
        handler: async () => new Response(null, { status: 204 }),
      },
    ]
  );

  assert.equal(response.headers.get('X-Request-ID'), 'req-existing');
});

test('dispatchControllerRoutes returns 404 for unknown paths', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/admin/missing'), []);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'not_found');
});

test('dispatchControllerRoutes returns 405 with path-specific allowed methods', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/admin/example', 'POST'), [
    {
      method: 'GET',
      path: '/api/admin/example',
      handler: async () => new Response(null, { status: 204 }),
    },
  ]);
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'OPTIONS, GET');
  assert.equal(body.error.code, 'method_not_allowed');
});

test('dispatchControllerRoutes handles OPTIONS before controller methods', async () => {
  let called = false;
  const response = await dispatchControllerRoutes(createRequest('/api/admin/example', 'OPTIONS'), [
    {
      method: 'GET',
      path: '/api/admin/example',
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

test('dispatchControllerRoutes rejects disallowed origins', async () => {
  const response = await dispatchControllerRoutes(
    createRequest('/api/admin/example', 'GET', 'https://evil.example'),
    [
      {
        method: 'GET',
        path: '/api/admin/example',
        handler: async () => new Response(null, { status: 204 }),
      },
    ]
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'origin_not_allowed');
});

test('dispatchControllerRoutes rejects protected mutations without an Origin header', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/admin/user', 'PATCH', null), [
    {
      method: 'PATCH',
      path: '/api/admin/user',
      handler: async () => new Response(null, { status: 204 }),
    },
  ]);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).error.code, 'origin_not_allowed');
});

test('dispatchControllerRoutes rejects cross-site protected mutations', async () => {
  const request = createRequest('/api/admin/session', 'DELETE');
  request.headers.set('Sec-Fetch-Site', 'cross-site');

  const response = await dispatchControllerRoutes(request, [
    {
      method: 'DELETE',
      path: '/api/admin/session',
      handler: async () => new Response(null, { status: 204 }),
    },
  ]);

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'origin_not_allowed');
});

test('dispatchControllerRoutes permits protected reads without an Origin header', async () => {
  const response = await dispatchControllerRoutes(createRequest('/api/admin/user', 'GET', null), [
    {
      method: 'GET',
      path: '/api/admin/user',
      handler: async () => new Response(null, { status: 204 }),
    },
  ]);

  assert.equal(response.status, 204);
});

function createRequest(
  path: string,
  method = 'GET',
  origin: string | null = 'https://arg.software',
  requestId = ''
) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (requestId) headers.set('x-request-id', requestId);

  return new Request(`https://arg.software${path}`, {
    method,
    headers,
  });
}
