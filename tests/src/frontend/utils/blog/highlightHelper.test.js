import assert from 'node:assert/strict';
import test from 'node:test';
import { highlightCode } from '../../../../../src/frontend/utils/blog/highlightHelper.js';

test('plaintext skips language auto-detection', () => {
  const result = highlightCode('{"ok": true}', 'plaintext');
  assert.equal(result.detectedLang, 'plaintext');
  assert.equal(result.html.includes('hljs-'), false);
  assert.equal(result.html.includes('&quot;ok&quot;'), true);
});

test('explicit json and sql keep those languages', () => {
  assert.equal(highlightCode('{"ok": true}', 'json').detectedLang, 'json');
  assert.equal(highlightCode('SELECT 1;', 'sql').detectedLang, 'sql');
});
