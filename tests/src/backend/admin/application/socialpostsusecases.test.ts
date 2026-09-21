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
    async deleteMissing() {
      throw new Error('should not prune');
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
  let stored = [];
  let bufferInput;
  const storedPost = { ...posts[0], id: 'post-1', coverImageUrl: 'https://storage.example/buffer-1.webp' };
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts(input) {
        bufferInput = input;
        return posts;
      },
    },
    {
      async list(query) {
        if (query.pageSize === 1) return { records: [], totalRecords: 0 };
        return { records: [storedPost], totalRecords: 1 };
      },
      async upsertMany(records) {
        upserted = records;
        return records.length;
      },
      async deleteMissing(ids) {
        assert.deepEqual(ids, ['buffer-1']);
        return 0;
      },
    },
    {
      async fetchCoverFromText(text) {
        assert.equal(text, posts[0].text);
        return 'https://arg.software/images/og.webp';
      },
    },
    {
      async store(bufferPostId, sourceUrl) {
        stored.push({ bufferPostId, sourceUrl });
        return `https://storage.example/${bufferPostId}.webp`;
      },
      async removeMissing() {},
    }
  );

  const result = await useCase.execute();

  assert.deepEqual(bufferInput, { publishedAfter: undefined, limit: 30 });
  assert.equal(result.upserted, 1);
  assert.deepEqual(stored, [
    { bufferPostId: 'buffer-1', sourceUrl: 'https://arg.software/images/og.webp' },
  ]);
  assert.deepEqual(upserted, [
    {
      ...posts[0],
      coverImageUrl: 'https://storage.example/buffer-1.webp',
    },
  ]);
});

test('stores Buffer cover images without fetching Open Graph', async () => {
  const posts = [
    {
      bufferPostId: 'buffer-2',
      text: 'Shipped a new system. https://arg.software/blog/example/',
      coverImageUrl: 'https://cdn.buffer.com/cover.webp',
      externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
      publishedAt: '2026-09-02T09:00:00.000Z',
      likeCount: 0,
    },
  ];
  const latest = {
    id: 'post-1',
    bufferPostId: 'buffer-1',
    text: 'Older post',
    coverImageUrl: 'https://storage.example/buffer-1.webp',
    externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:0',
    publishedAt: '2026-09-01T09:00:00.000Z',
    likeCount: 1,
  };
  let upserted = [];
  let fetchedCover = false;
  let bufferInput;
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts(input) {
        bufferInput = input;
        return posts;
      },
    },
    {
      async list(query) {
        if (query.pageSize === 1) return { records: [latest], totalRecords: 30 };
        return { records: [{ ...posts[0], id: 'post-2' }, latest], totalRecords: 30 };
      },
      async upsertMany(records) {
        upserted = records;
        return records.length;
      },
      async deleteMissing() {
        return 1;
      },
    },
    {
      async fetchCoverFromText() {
        fetchedCover = true;
        return 'https://arg.software/images/og.webp';
      },
    },
    {
      async store(bufferPostId, sourceUrl) {
        assert.equal(sourceUrl, 'https://cdn.buffer.com/cover.webp');
        return `https://storage.example/${bufferPostId}.webp`;
      },
      async removeMissing() {},
    }
  );

  await useCase.execute();

  assert.deepEqual(bufferInput, {
    publishedAfter: '2026-09-01T09:00:00.000Z',
    limit: undefined,
  });
  assert.equal(fetchedCover, false);
  assert.equal(upserted[0].coverImageUrl, 'https://storage.example/buffer-2.webp');
});

test('prunes to the newest posts when Buffer has nothing new', async () => {
  let upsertCalled = false;
  let pruned = [];
  const kept = [
    {
      id: 'post-1',
      bufferPostId: 'buffer-1',
      text: 'Newest',
      coverImageUrl: 'https://storage.example/buffer-1.webp',
      externalUrl: null,
      publishedAt: '2026-09-01T09:00:00.000Z',
      likeCount: 0,
    },
  ];
  const useCase = new SyncSocialPostsUseCase(
    {
      async listSentLinkedInPosts() {
        return [];
      },
    },
    {
      async list(query) {
        if (query.pageSize === 1) return { records: [kept[0]], totalRecords: 168 };
        return { records: kept, totalRecords: 30 };
      },
      async upsertMany() {
        upsertCalled = true;
        return 0;
      },
      async deleteMissing(ids) {
        pruned = ids;
        return 138;
      },
    },
    {
      async fetchCoverFromText() {
        throw new Error('should not fetch cover');
      },
    },
    {
      async store() {
        throw new Error('should not store');
      },
      async removeMissing(ids) {
        assert.deepEqual(ids, ['buffer-1']);
      },
    }
  );

  const result = await useCase.execute();

  assert.equal(result.upserted, 0);
  assert.equal(upsertCalled, false);
  assert.deepEqual(pruned, ['buffer-1']);
});
