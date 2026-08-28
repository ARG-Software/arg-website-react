import assert from 'node:assert/strict';
import test from 'node:test';

import { VisitsController } from '../../apps/api/controllers/visits.controller.js';
import { DeleteVisitSessionUseCase } from '../../application/usecases/visits/deletevisitsession.usecase.js';

class TestVisitsController extends VisitsController {
  protected override authenticateUser(): Promise<any> {
    return Promise.resolve({ email: 'admin@arg.software' });
  }
}

test('deletes visit sessions through the authenticated admin endpoint', async () => {
  let deletedSessionHash = '';
  const controller = new TestVisitsController({
    deleteVisitSessionUseCase: new DeleteVisitSessionUseCase({
      async deleteById(sessionHash) {
        deletedSessionHash = sessionHash;
      },
    } as any),
  } as any);
  const response = await controller.delete(
    new Request('https://arg.software/api/admin/visit-session?sessionHash=session-hash', {
      method: 'DELETE',
    })
  );

  assert.equal(response.status, 204);
  assert.equal(deletedSessionHash, 'session-hash');
});
