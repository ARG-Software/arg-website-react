import assert from 'node:assert/strict';
import test from 'node:test';

import { KeepDatabasesAliveUseCase } from '../../application/usecases/keepDatabasesAliveUseCase.js';

test('touches all configured maintenance databases', async () => {
  let touched = false;
  const useCase = new KeepDatabasesAliveUseCase({
    deleteOldAssistantConversations: async () => 0,
    deleteOldVisitSessions: async () => ({ events: 0, sessions: 0 }),
    keepDatabasesAlive: async () => {
      touched = true;
    },
  });

  await useCase.execute();

  assert.equal(touched, true);
});

test('throws keep-alive repository errors', async () => {
  const error = new Error('Supabase failed');
  const useCase = new KeepDatabasesAliveUseCase({
    deleteOldAssistantConversations: async () => 0,
    deleteOldVisitSessions: async () => ({ events: 0, sessions: 0 }),
    keepDatabasesAlive: async () => {
      throw error;
    },
  });

  await assert.rejects(() => useCase.execute(), error);
});
