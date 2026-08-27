import assert from 'node:assert/strict';
import test from 'node:test';

import { createUserAccessPolicy } from '../../application/policies/useraccess.policy.js';
import { AuthenticateUserUseCase } from '../../application/usecases/sessions/authenticateuser.usecase.js';

test('allows active admin users from the database-backed repository', async () => {
  const policy = createUserAccessPolicy({
    findActiveByEmail: email => (email === 'admin@arg.software' ? { email, role: 'admin' } : null),
  });

  assert.equal(await policy.canAccess('admin@arg.software'), true);
  assert.equal(await policy.canAccess('other@arg.software'), false);
});

test('authentication rejects authenticated users that are not active admins', async () => {
  const useCase = new AuthenticateUserUseCase(
    { getUser: async () => ({ email: 'other@arg.software' }) } as any,
    { canAccess: async () => false }
  );

  await assert.rejects(
    useCase.execute('token'),
    {
      code: 'forbidden',
      message: 'Admin access denied',
    }
  );
});
