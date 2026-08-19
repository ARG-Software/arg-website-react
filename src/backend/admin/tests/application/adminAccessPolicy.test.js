import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminAccessPolicy } from '../../application/admin/adminAccessPolicy.js';
import { authenticateAdmin } from '../../application/admin/authenticateAdmin.js';

test('allows active admin users from the database-backed repository', async () => {
  const policy = createAdminAccessPolicy({
    findActiveByEmail: email => (email === 'admin@arg.software' ? { email, role: 'admin' } : null),
  });

  assert.equal(await policy.canAccess('admin@arg.software'), true);
  assert.equal(await policy.canAccess('other@arg.software'), false);
});

test('authentication rejects authenticated users that are not active admins', async () => {
  await assert.rejects(
    authenticateAdmin('token', {
      adminAccessPolicy: { canAccess: () => false },
      identityProvider: { getUser: () => ({ email: 'other@arg.software' }) },
    }),
    {
      code: 'forbidden',
      message: 'Admin access denied',
    }
  );
});
