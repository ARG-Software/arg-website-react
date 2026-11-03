import assert from 'node:assert/strict';
import test from 'node:test';

import { ListArchitectReleasesUseCase } from '../../../../../src/backend/admin/application/usecases/architectReleases/listarchitectreleases.usecase.js';
import { SyncArchitectReleasesUseCase } from '../../../../../src/backend/admin/application/usecases/architectReleases/syncarchitectreleases.usecase.js';

test('lists architect releases with excerpts and pagination', async () => {
  const useCase = new ListArchitectReleasesUseCase({
    async list(query) {
      assert.deepEqual(query, { page: 1, pageSize: 100 });
      return {
        records: [
          {
            id: 'release-1',
            githubId: '42',
            tagName: 'v1.1.6',
            name: 'Compare runs',
            body: 'A'.repeat(200),
            htmlUrl: 'https://github.com/ARG-Software/arg-architect/releases/tag/v1.1.6',
            publishedAt: '2026-11-01T09:00:00.000Z',
          },
        ],
        totalRecords: 1,
      };
    },
    async upsertMany() {
      throw new Error('should not upsert');
    },
  });

  const result = await useCase.execute({ page: 1, pageSize: 100 });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].id, 'release-1');
  assert.equal(result.records[0].tagName, 'v1.1.6');
  assert.equal(result.records[0].body, 'A'.repeat(200));
  assert.equal(result.records[0].excerpt.endsWith('…'), true);
  assert.equal(result.records[0].excerpt.length, 180);
  assert.deepEqual(result.pagination, {
    page: 1,
    pageSize: 100,
    totalRecords: 1,
    totalPages: 1,
  });
});

test('syncs GitHub releases newer than the latest stored release', async () => {
  const latest = {
    id: 'release-1',
    githubId: '41',
    tagName: 'v1.1.5',
    name: 'v1.1.5',
    body: 'Older notes.',
    htmlUrl: 'https://github.com/ARG-Software/arg-architect/releases/tag/v1.1.5',
    publishedAt: '2026-10-12T09:00:00.000Z',
  };
  const releases = [
    {
      githubId: '42',
      tagName: 'v1.1.6',
      name: 'Compare runs',
      body: 'Side-by-side compare.',
      htmlUrl: 'https://github.com/ARG-Software/arg-architect/releases/tag/v1.1.6',
      publishedAt: '2026-11-01T09:00:00.000Z',
    },
  ];
  let listedLatest = false;
  let githubInput;
  let upserted = [];
  const useCase = new SyncArchitectReleasesUseCase(
    {
      async listReleases(input) {
        githubInput = input;
        return releases;
      },
    },
    {
      async list(query) {
        listedLatest = query.pageSize === 1;
        return { records: [latest], totalRecords: 1 };
      },
      async upsertMany(records) {
        upserted = records;
        return records.length;
      },
    }
  );

  const result = await useCase.execute();

  assert.equal(listedLatest, true);
  assert.deepEqual(githubInput, { publishedAfter: latest.publishedAt });
  assert.equal(result.upserted, 1);
  assert.deepEqual(upserted, releases);
});

test('returns zero when GitHub has no newer releases', async () => {
  let upsertCalled = false;
  const useCase = new SyncArchitectReleasesUseCase(
    {
      async listReleases() {
        return [];
      },
    },
    {
      async list() {
        return { records: [], totalRecords: 0 };
      },
      async upsertMany() {
        upsertCalled = true;
        return 0;
      },
    }
  );

  const result = await useCase.execute();

  assert.equal(result.upserted, 0);
  assert.equal(upsertCalled, false);
});
