import assert from 'node:assert/strict';
import test from 'node:test';

import { createCorsHeaders, createOriginGuardResponse, isAllowedOrigin } from './apiOrigin.js';

test('allows configured production origins', () => {
  assert.equal(isAllowedOrigin('https://arg.software'), true);
  assert.equal(isAllowedOrigin('https://www.arg.software/'), true);
});

test('allows origins from ALLOWED_API_ORIGINS', () => {
  const previous = process.env.ALLOWED_API_ORIGINS;
  process.env.ALLOWED_API_ORIGINS = 'https://preview.example.com, https://branch.example.com/path';

  try {
    assert.equal(isAllowedOrigin('https://preview.example.com'), true);
    assert.equal(isAllowedOrigin('https://branch.example.com'), true);
  } finally {
    if (previous === undefined) {
      delete process.env.ALLOWED_API_ORIGINS;
    } else {
      process.env.ALLOWED_API_ORIGINS = previous;
    }
  }
});

test('does not reject requests with no origin header', () => {
  const request = new Request('https://arg.software/api/assistant/challenge');

  assert.equal(createOriginGuardResponse(request, 'GET, OPTIONS'), null);
  assert.equal(
    createCorsHeaders(request, 'GET, OPTIONS')['Access-Control-Allow-Origin'],
    undefined
  );
});

test('echoes allowed origin in CORS headers', () => {
  const request = new Request('https://arg.software/api/assistant/challenge', {
    headers: { Origin: 'https://arg.software' },
  });

  assert.equal(createOriginGuardResponse(request, 'GET, OPTIONS'), null);
  assert.equal(
    createCorsHeaders(request, 'GET, OPTIONS')['Access-Control-Allow-Origin'],
    'https://arg.software'
  );
});

test('rejects present but disallowed origin', async () => {
  const request = new Request('https://arg.software/api/assistant/challenge', {
    headers: { Origin: 'https://evil.example' },
  });
  const response = createOriginGuardResponse(request, 'GET, OPTIONS');

  assert.ok(response);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await response.json()).error.code, 'origin_not_allowed');
});
