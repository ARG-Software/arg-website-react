import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import markdownNegotiation from '../../netlify/edge-functions/markdownNegotiation.js';

const ROOT_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const HSTS_POLICY = 'max-age=63072000; includeSubDomains; preload';

test('static responses use the two-year HSTS preload policy', () => {
  const headers = readFileSync(join(ROOT_DIR, 'public/_headers'), 'utf8');

  assert.match(headers, new RegExp(`Strict-Transport-Security: ${HSTS_POLICY}`));
});

test('edge responses use the same HSTS policy for function routes', async () => {
  const request = new Request('https://arg.software/api/admin/session');
  const upstreamResponse = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  upstreamResponse.headers.append('Set-Cookie', 'access=token; HttpOnly; Secure');
  upstreamResponse.headers.append('Set-Cookie', 'refresh=token; HttpOnly; Secure');
  const response = await markdownNegotiation(request, {
    next: async () => upstreamResponse,
  });

  assert.equal(response.headers.get('Strict-Transport-Security'), HSTS_POLICY);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(await response.text(), '{}');
});
