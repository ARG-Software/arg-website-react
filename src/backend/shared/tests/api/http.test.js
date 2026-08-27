import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApiHttp,
  createCorsHeaders,
  createErrorBody,
  createJsonResponse,
  createOriginGuardResponse,
  getClientIp,
  isAllowedOrigin,
} from '../../api/http.js';

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

test('allows configured production origins', () => {
  assert.equal(isAllowedOrigin('https://arg.software'), true);
  assert.equal(isAllowedOrigin('https://www.arg.software/'), true);
});

test('allows origins from injected ALLOWED_API_ORIGINS', () => {
  const options = {
    env: {
      ALLOWED_API_ORIGINS: 'https://preview.example.com, https://branch.example.com/path',
    },
  };

  assert.equal(isAllowedOrigin('https://preview.example.com', options), true);
  assert.equal(isAllowedOrigin('https://branch.example.com', options), true);
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

test('creates endpoint-scoped HTTP helpers', async () => {
  const http = createApiHttp({ allowedMethods: 'POST, OPTIONS' });
  const request = new Request('https://arg.software/api/assistant/ask', {
    headers: { Origin: 'https://arg.software' },
  });
  const response = http.createJsonResponse(request, 200, { ok: true });

  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.deepEqual(await response.json(), { ok: true });
});

test('reads Netlify client IP before forwarded headers', () => {
  const request = new Request('https://arg.software/api/assistant/ask', {
    headers: {
      'x-nf-client-connection-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.10, 198.51.100.11',
    },
  });

  assert.equal(getClientIp(request), '203.0.113.10');
});

test('falls back to forwarded client IP and unknown', () => {
  const forwardedRequest = new Request('https://arg.software/api/assistant/ask', {
    headers: {
      'x-forwarded-for': '198.51.100.10, 198.51.100.11',
    },
  });
  const anonymousRequest = new Request('https://arg.software/api/assistant/ask');

  assert.equal(getClientIp(forwardedRequest), '198.51.100.10');
  assert.equal(getClientIp(anonymousRequest), 'unknown');
});
