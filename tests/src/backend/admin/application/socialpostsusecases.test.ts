import assert from 'node:assert/strict';
import test from 'node:test';

import { ListSocialPostsUseCase } from '../../../../../src/backend/admin/application/usecases/socialPosts/listsocialposts.usecase.js';
import { SyncSocialPostsUseCase } from '../../../../../src/backend/admin/application/usecases/socialPosts/syncsocialposts.usecase.js';

test('lists social posts with excerpts and pagination', async () => {
  const useCase = new ListSocialPostsUseCase({
    async list(query) {
      assert.deepEqual(query, { page: 1, pageSize: 3 });
      return {
        records: [
          {
            id: 'post-1',
            bufferPostId: 'buffer-1',
            text: 'A'.repeat(200),
            coverImageUrl: 'https://cdn.example/cover.webp',
            externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
            publishedAt: '2026-09-01T09:00:00.000Z',
            likeCount: 12,
          },
        ],
        totalRecords: 1,
      };
    },
    async upsertMany() {
      throw new Error('should not upsert');
    },
  });

  const result = await useCase.execute({ page: 1, pageSize: 3 });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].id, 'post-1');
  assert.equal(result.records[0].likeCount, 12);
  assert.equal(result.records[0].text, 'A'.repeat(200));
  assert.equal(result.records[0].excerpt.endsWith('…'), true);
  assert.equal(result.records[0].excerpt.length, 180);
  assert.deepEqual(result.pagination, {
    page: 1,
    pageSize: 3,
    totalRecords: 1,
    totalPages: 1,
  });
});

test('syncs sent Buffer posts into the repository', async () => {
  const posts = [
    {
      bufferPostId: 'buffer-1',
      text: 'Shipped a new system. https://arg.software/blog/example/',
      coverImageUrl: null,
      externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
      publishedAt: '2026-09-01T09:00:00.000Z',
      likeCount: 4,
    },
  ];
  let upserted = [];
  let coverText = '';
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts() {
        return posts;
      },
    },
    {
      async list() {
        throw new Error('should not list');
      },
      async upsertMany(records) {
        upserted = records;
        return records.length;
      },
    },
    {
      async fetchCoverFromText(text) {
        coverText = text;
        return 'https://arg.software/images/og.webp';
      },
    }
  );

  const result = await useCase.execute();

  assert.equal(result.upserted, 1);
  assert.equal(coverText, posts[0].text);
  assert.deepEqual(upserted, [
    {
      ...posts[0],
      coverImageUrl: 'https://arg.software/images/og.webp',
    },
  ]);
});

test('keeps Buffer cover images without fetching Open Graph', async () => {
  const posts = [
    {
      bufferPostId: 'buffer-1',
      text: 'Shipped a new system. https://arg.software/blog/example/',
      coverImageUrl: 'https://cdn.buffer.com/cover.webp',
      externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
      publishedAt: '2026-09-01T09:00:00.000Z',
      likeCount: 0,
    },
  ];
  let upserted = [];
  let fetchedCover = false;
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts() {
        return posts;
      },
    },
    {
      async list() {
        throw new Error('should not list');
      },
      async upsertMany(records) {
        upserted = records;
        return records.length;
      },
    },
    {
      async fetchCoverFromText() {
        fetchedCover = true;
        return 'https://arg.software/images/og.webp';
      },
    }
  );

  await useCase.execute();

  assert.equal(fetchedCover, false);
  assert.deepEqual(upserted, posts);
});

test('syncs nothing when Buffer returns no posts', async () => {
  let upsertCalled = false;
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts() {
        return [];
      },
    },
    {
      async list() {
        throw new Error('should not list');
      },
      async upsertMany() {
        upsertCalled = true;
        return 0;
      },
    },
    {
      async fetchCoverFromText() {
        throw new Error('should not fetch cover');
      },
    }
  );

  const result = await useCase.execute();

  assert.equal(result.upserted, 0);
  assert.equal(upsertCalled, false);
});
