import assert from 'node:assert/strict';
import test from 'node:test';

import { encodeIndex, hashWithSalt } from '../../application/crypto/encode.js';

test('hashWithSalt preserves the existing outreach audit hash format', () => {
  assert.equal(
    hashWithSalt('admin@example.com', 'outreach'),
    'd56d3bc3234a47ac6132a2b17210bcdf93f6e5fe50a0cd67be985e1de5bafe8b'
  );
});

test('encodeIndex preserves the existing visit session hash prefix format', () => {
  assert.equal(encodeIndex('session-123', 'visit-key').slice(0, 16), '650e01249a634b59');
});
