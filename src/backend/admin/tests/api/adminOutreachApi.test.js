import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdminResponse,
  createErrorBody,
  createHttpError,
  getHttpErrorBody,
  getHttpErrorStatus,
} from '../../apps/adminOutreachApi.js';

test('creates admin responses with admin allowed methods', async () => {
  const request = new Request('https://arg.software/api/admin/outreach', {
    headers: { Origin: 'https://arg.software' },
  });
  const response = createAdminResponse(
    request,
    401,
    createErrorBody('unauthenticated', 'Login required')
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://arg.software');
  assert.deepEqual(await response.json(), {
    error: {
      code: 'unauthenticated',
      message: 'Login required',
    },
  });
});

test('maps known admin errors to their HTTP response details', () => {
  const error = createHttpError(403, 'forbidden', 'Admin access denied');

  assert.equal(getHttpErrorStatus(error), 403);
  assert.deepEqual(getHttpErrorBody(error), {
    error: {
      code: 'forbidden',
      message: 'Admin access denied',
    },
  });
});

test('hides unknown admin errors behind a generic response', () => {
  const error = new Error('database exploded');

  assert.equal(getHttpErrorStatus(error), 500);
  assert.deepEqual(getHttpErrorBody(error), {
    error: {
      code: 'admin_request_failed',
      message: 'Admin request failed',
    },
  });
});
