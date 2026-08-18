import assert from 'node:assert/strict';
import test from 'node:test';

import { createErrorBody, createJsonResponse } from '../implementations/common/httpJson.js';

test('creates consistent JSON error bodies', () => {
  assert.deepEqual(createErrorBody('invalid_json', 'Invalid JSON body'), {
    error: {
      code: 'invalid_json',
      message: 'Invalid JSON body',
    },
  });
});

test('creates JSON responses with endpoint CORS headers', async () => {
  const request = new Request('https://arg.software/api/security/verify', {
    headers: { Origin: 'https://arg.software' },
  });
  const response = createJsonResponse(request, 'POST, OPTIONS', 200, { verified: true });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
  assert.deepEqual(await response.json(), { verified: true });
});

test('does not serialize a response body for 204 responses', async () => {
  const request = new Request('https://arg.software/api/security/challenge');
  const response = createJsonResponse(request, 'GET, OPTIONS', 204, '');

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
});
