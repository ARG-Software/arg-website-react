import assert from 'node:assert/strict';
import test from 'node:test';

import { ArchitectReleasesController } from '../../../../../src/backend/admin/apps/api/controllers/architectreleases.controller.js';
import { ACCESS_COOKIE_NAME } from '../../../../../src/backend/admin/apps/http/usersession.cookies.js';
import { createAdminError } from '../../../../../src/backend/admin/application/errors.js';
import { ListArchitectReleasesUseCase } from '../../../../../src/backend/admin/application/usecases/architectReleases/listarchitectreleases.usecase.js';
import { SyncArchitectReleasesUseCase } from '../../../../../src/backend/admin/application/usecases/architectReleases/syncarchitectreleases.usecase.js';

class TestArchitectReleasesController extends ArchitectReleasesController {
  constructor(architectReleases) {
    super(architectReleases, { execute: async () => ({ email: 'admin@arg.software' }) });
  }
}

test('lists public architect releases without authentication', async () => {
  const api = createTestApi();
  const response = await api(
    new Request('https://arg.software/api/architect-releases?page=1', {
      headers: { Origin: 'https://arg.software' },
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records.length, 1);
  assert.equal(body.records[0].tagName, 'v1.1.6');
  assert.deepEqual(body.pagination, {
    page: 1,
    pageSize: 100,
    totalRecords: 1,
    totalPages: 1,
  });
});

test('lists admin architect releases after authentication', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/architect-releases?page=1&pageSize=10'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records[0].id, 'release-1');
  assert.equal(body.pagination.pageSize, 10);
});

test('syncs architect releases after authentication', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/architect-releases/sync', 'POST'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.upserted, 1);
});

test('admin architect releases list authenticates before listing', async () => {
  let listed = false;
  const controller = new ArchitectReleasesController(
    {
      listArchitectReleasesUseCase: {
        async execute() {
          listed = true;
          return { records: [], pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 1 } };
        },
      },
      syncArchitectReleasesUseCase: { async execute() {} },
    },
    {
      async execute() {
        throw createAdminError(401, 'unauthenticated', 'Login required');
      },
    }
  );
  const response = await controller.list(
    new Request('https://arg.software/api/admin/architect-releases', {
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
            id: 'release-1',
            githubId: '42',
            tagName: 'v1.1.6',
            name: 'Compare runs',
            body: 'Side-by-side compare.',
            htmlUrl: 'https://github.com/ARG-Software/arg-architect/releases/tag/v1.1.6',
            publishedAt: '2026-11-01T09:00:00.000Z',
          },
        ],
        totalRecords: 1,
      };
    },
    async upsertMany(records) {
      return records.length;
    },
  };
  const controller = new TestArchitectReleasesController({
    listArchitectReleasesUseCase: new ListArchitectReleasesUseCase(repository),
    syncArchitectReleasesUseCase: new SyncArchitectReleasesUseCase(
      {
        async listReleases() {
          return [
            {
              githubId: '43',
              tagName: 'v1.1.7',
              name: 'Compare runs',
              body: 'Side-by-side compare.',
              htmlUrl: 'https://github.com/ARG-Software/arg-architect/releases/tag/v1.1.7',
              publishedAt: '2026-11-02T09:00:00.000Z',
            },
          ];
        },
      },
      repository
    ),
  });

  return async function api(request) {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/api/architect-releases') {
      return controller.publicList(request);
    }
    if (request.method === 'GET' && pathname === '/api/admin/architect-releases') {
      return controller.list(request);
    }
    if (request.method === 'POST' && pathname === '/api/admin/architect-releases/sync') {
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
