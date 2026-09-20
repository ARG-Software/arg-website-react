import assert from 'node:assert/strict';
import test from 'node:test';

import { parseIntentResponse } from '../../../../../src/backend/rag/application/llm/outputparsers.js';

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
    purpose: 'general',
    task: 'shorten_previous_answer',
    response: '',
    language: 'en',
  });
});

test('intent parser accepts canonical purpose independent of visitor language', () => {
  const result = parseIntentResponse(
    JSON.stringify({
      intent: 'rag_question',
      purpose: 'capability_evaluation',
      response: '',
      language: 'zh-CN',
    })
  );

  assert.equal(result.purpose, 'capability_evaluation');
  assert.equal(result.language, 'zh-CN');
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
