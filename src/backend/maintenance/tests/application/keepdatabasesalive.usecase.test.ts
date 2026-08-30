import assert from 'node:assert/strict';
import test from 'node:test';

import { KeepDatabasesAliveUseCase } from '../../application/usecases/keepdatabasesalive.usecase.js';

test('touches all configured maintenance databases', async () => {
  let touchCount = 0;
  const useCase = new KeepDatabasesAliveUseCase([
    {
      touch: async () => {
        touchCount += 1;
      },
    },
    {
      touch: async () => {
        touchCount += 1;
      },
    },
  ]);

  await useCase.execute();

  assert.equal(touchCount, 2);
});

test('throws keep-alive repository errors', async () => {
  const error = new Error('Supabase failed');
  const useCase = new KeepDatabasesAliveUseCase([
    {
      touch: async () => {
        throw error;
      },
    },
  ]);

  await assert.rejects(() => useCase.execute(), error);
});
