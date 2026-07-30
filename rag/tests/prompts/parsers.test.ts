import assert from 'node:assert/strict';
import test from 'node:test';

import { parseIntentResponse } from '../../prompts/parsers.js';

test('intent parser accepts conversation transform tasks', () => {
  const result = parseIntentResponse(
    JSON.stringify({
      intent: 'conversation_transform',
      task: 'shorten_previous_answer',
      response: '',
      language: 'en',
    })
  );

  assert.deepEqual(result, {
    intent: 'conversation_transform',
    task: 'shorten_previous_answer',
    response: '',
    language: 'en',
  });
});

test('intent parser defaults malformed transform tasks to simplification', () => {
  const result = parseIntentResponse(
    JSON.stringify({
      intent: 'conversation_transform',
      task: 'unknown_task',
      response: '',
      language: 'en',
    })
  );

  assert.equal(result.task, 'simplify_previous_answer');
});
