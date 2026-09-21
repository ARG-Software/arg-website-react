import assert from 'node:assert/strict';
import test from 'node:test';

import { SocialPostsController } from '../../../../../src/backend/admin/apps/api/controllers/socialposts.controller.js';
import { ACCESS_COOKIE_NAME } from '../../../../../src/backend/admin/apps/http/usersession.cookies.js';
import { createAdminError } from '../../../../../src/backend/admin/application/errors.js';
import { ListSocialPostsUseCase } from '../../../../../src/backend/admin/application/usecases/socialPosts/listsocialposts.usecase.js';
import { SyncSocialPostsUseCase } from '../../../../../src/backend/admin/application/usecases/socialPosts/syncsocialposts.usecase.js';

class TestSocialPostsController extends SocialPostsController {
  constructor(socialPosts) {
    super(socialPosts, { execute: async () => ({ email: 'admin@arg.software' }) });
  }
}

test('lists public social posts without authentication', async () => {
  const api = createTestApi();
  const response = await api(
    new Request('https://arg.software/api/social-posts?page=1', {
      headers: { Origin: 'https://arg.software' },
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records.length, 1);
  assert.equal(body.records[0].excerpt, 'Shipped a new system.');
  assert.deepEqual(body.pagination, {
    page: 1,
    pageSize: 3,
    totalRecords: 1,
    totalPages: 1,
  });
});

test('lists admin social posts after authentication', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/social-posts?page=1&pageSize=10'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records[0].id, 'post-1');
  assert.deepEqual(body.pagination.pageSize, 10);
});

test('syncs social posts after authentication', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/social-posts/sync', 'POST'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.upserted, 1);
});

test('admin social posts list authenticates before listing', async () => {
  let listed = false;
  const controller = new SocialPostsController(
    {
      listSocialPostsUseCase: {
        async execute() {
          listed = true;
          return { records: [], pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 1 } };
        },
      },
      syncSocialPostsUseCase: { async execute() {} },
    },
    {
      async execute() {
        throw createAdminError(401, 'unauthenticated', 'Login required');
      },
    }
  );
  const response = await controller.list(
    new Request('https://arg.software/api/admin/social-posts', {
      headers: { Origin: 'https://arg.software' },
    })
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'unauthenticated');
  assert.equal(listed, false);
});

function createTestApi() {
  const repository = {
    async list() {
      return {
        records: [
          {
            id: 'post-1',
            bufferPostId: 'buffer-1',
            text: 'Shipped a new system.',
            coverImageUrl: null,
            externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
            publishedAt: '2026-09-01T09:00:00.000Z',
            likeCount: 3,
          },
        ],
        totalRecords: 1,
      };
    },
    async upsertMany(records) {
      return records.length;
    },
    async deleteMissing() {
      return 0;
    },
  };
  const controller = new TestSocialPostsController({
    listSocialPostsUseCase: new ListSocialPostsUseCase(repository),
    syncSocialPostsUseCase: new SyncSocialPostsUseCase(
      {
        async listSentLinkedInPosts() {
          return [
            {
              bufferPostId: 'buffer-1',
              text: 'Shipped a new system.',
              coverImageUrl: null,
              externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
              publishedAt: '2026-09-01T09:00:00.000Z',
              likeCount: 3,
            },
          ];
        },
      },
      repository,
      {
        async fetchCoverFromText() {
          return null;
        },
      },
      {
        async store() {
          return null;
        },
        async removeMissing() {},
      }
    ),
  });

  return async function api(request) {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/api/social-posts') return controller.publicList(request);
    if (request.method === 'GET' && pathname === '/api/admin/social-posts') return controller.list(request);
    if (request.method === 'POST' && pathname === '/api/admin/social-posts/sync') {
      return controller.sync(request);
    }

    return new Response(null, { status: 404 });
  };
}

function createAdminRequest(path, method = 'GET') {
  return new Request(`https://arg.software${path}`, {
    method,
    headers: {
      Origin: 'https://arg.software',
      Cookie: `${ACCESS_COOKIE_NAME}=token`,
    },
  });
}
