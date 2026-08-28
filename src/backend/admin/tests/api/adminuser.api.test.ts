import assert from 'node:assert/strict';
import test from 'node:test';

import { UserController } from '../../apps/api/controllers/user.controller.js';
import { ACCESS_COOKIE_NAME } from '../../apps/http/usersession.cookies.js';
import { createAdminError } from '../../application/errors.js';
import { UpdateUserUseCase } from '../../application/usecases/users/updateuser.usecase.js';

class TestUserController extends UserController {
  constructor(users, private readonly authenticatedUser = { email: 'admin@arg.software' }) {
    super(users);
  }

  protected override authenticateUser(): Promise<any> {
    if (this.authenticatedUser instanceof Error) {
      return Promise.reject(this.authenticatedUser);
    }

    return Promise.resolve(this.authenticatedUser);
  }
}

test('PATCH /api/admin/user updates user name', async () => {
  let updatedData = null;
  const controller = createTestController((token, data) => {
    updatedData = data;
  });

  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ name: 'New Name' }),
  });

  const response = await controller.update(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.success);
  assert.deepEqual(updatedData, { name: 'New Name' });
});

test('PATCH /api/admin/user updates password', async () => {
  let updatedData = null;
  const controller = createTestController((token, data) => {
    updatedData = data;
  });

  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ password: 'new-secret' }),
  });

  const response = await controller.update(request);
  assert.equal(response.status, 200);
  assert.deepEqual(updatedData, { password: 'new-secret' });
});

test('PATCH /api/admin/user returns 400 if no valid data', async () => {
  const controller = createTestController();
  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
      Cookie: `${ACCESS_COOKIE_NAME}=valid-token`,
    },
    body: JSON.stringify({ name: '' }),
  });

  const response = await controller.update(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'invalid_update');
});

test('PATCH /api/admin/user authenticates before parsing the request body', async () => {
  const controller = createTestController(
    () => {
      throw new Error('update should not be called');
    },
    createAdminError(401, 'unauthenticated', 'Login required')
  );
  const request = new Request('https://arg.software/api/admin/user', {
    method: 'PATCH',
    headers: {
      Origin: 'https://arg.software',
      'Content-Type': 'application/json',
    },
    body: '{',
  });

  const response = await controller.update(request);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'unauthenticated');
});

function createTestController(
  updateUser = async () => {},
  authenticatedUser: any = { email: 'admin@arg.software' }
) {
  return new TestUserController(
    {
      updateUserUseCase: new UpdateUserUseCase({ updateUser } as any),
    },
    authenticatedUser
  );
}
