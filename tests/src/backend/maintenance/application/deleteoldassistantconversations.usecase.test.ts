import assert from 'node:assert/strict';
import test from 'node:test';

import { DeleteOldAssistantConversationsUseCase } from '../../../../../src/backend/maintenance/application/usecases/deleteoldassistantconversations.usecase.js';

test('deletes assistant conversations older than the published 60-day retention period', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-09-20T00:00:00.000Z'));
  let receivedCutoff = '';
  const useCase = new DeleteOldAssistantConversationsUseCase({
    deleteOlderThan: async cutoff => {
      receivedCutoff = cutoff;
      return 4;
    },
  });

  const result = await useCase.execute();

  assert.equal(receivedCutoff, '2026-07-22T00:00:00.000Z');
  assert.deepEqual(result, {
    cutoff: '2026-07-22T00:00:00.000Z',
    deleted: 4,
  });
});
