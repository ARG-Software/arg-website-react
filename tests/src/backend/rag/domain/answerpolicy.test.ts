import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAssistantAnswer } from '../../../../../src/backend/rag/domain/answers/answerpolicy.js';

test('team voice rewrites ARG as the subject but not after a preposition', () => {
  assert.equal(normalizeAssistantAnswer('ARG Software is remote-first.'), 'we are remote-first.');
  assert.equal(normalizeAssistantAnswer('Yes, ARG has open roles.'), 'Yes, we have open roles.');
  assert.equal(
    normalizeAssistantAnswer('Every role at ARG Software is remote.'),
    'Every role at ARG Software is remote.'
  );
  assert.equal(
    normalizeAssistantAnswer('Working with ARG is straightforward.'),
    'Working with ARG is straightforward.'
  );
});
