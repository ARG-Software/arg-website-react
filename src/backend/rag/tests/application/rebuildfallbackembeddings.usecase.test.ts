import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  IRagChunkReadRepository,
  IRagChunkWriteRepository,
  RagChunkFallbackEmbeddingUpdate,
  RagChunkRecord,
} from '../../application/ports/iragchunk.repository.js';
import type { IEmbeddingProvider } from '../../application/ports/iproviderports.js';
import { RebuildFallbackEmbeddingsUseCase } from '../../application/usecases/maintenance/rebuildfallbackembeddings.usecase.js';

test('RebuildFallbackEmbeddingsUseCase skips work when there are no chunks', async () => {
  const repository = createRepository([]);
  let providerCalled = false;
  const useCase = new RebuildFallbackEmbeddingsUseCase(
    repository,
    repository,
    createEmbeddingProvider(() => {
      providerCalled = true;
      return [];
    })
  );

  const result = await useCase.execute();

  assert.deepEqual(result, { chunkCount: 0, rebuiltCount: 0 });
  assert.equal(repository.calls.clearFallbackEmbeddings, 0);
  assert.equal(repository.calls.updateFallbackEmbeddings.length, 0);
  assert.equal(providerCalled, false);
});

test('RebuildFallbackEmbeddingsUseCase clears and rebuilds fallback embeddings by page', async () => {
  const chunks = Array.from({ length: 205 }, (_, index) => createChunk(index));
  const repository = createRepository(chunks);
  const embeddedTexts: string[][] = [];
  const progress: Array<{ chunkCount: number; rebuiltCount: number }> = [];
  let clearedCount: number | null = null;
  const useCase = new RebuildFallbackEmbeddingsUseCase(
    repository,
    repository,
    createEmbeddingProvider(texts => {
      embeddedTexts.push(texts);
      return texts.map((_, index) => [embeddedTexts.length, index]);
    })
  );

  const result = await useCase.execute({
    onCleared: chunkCount => {
      clearedCount = chunkCount;
    },
    onProgress: item => {
      progress.push(item);
    },
  });

  assert.deepEqual(result, { chunkCount: 205, rebuiltCount: 205 });
  assert.equal(clearedCount, 205);
  assert.equal(repository.calls.clearFallbackEmbeddings, 1);
  assert.deepEqual(repository.calls.listPage, [
    { offset: 0, pageSize: 100 },
    { offset: 100, pageSize: 100 },
    { offset: 200, pageSize: 100 },
  ]);
  assert.deepEqual(embeddedTexts.map(texts => texts.length), [100, 100, 5]);
  assert.deepEqual(progress, [
    { chunkCount: 205, rebuiltCount: 100 },
    { chunkCount: 205, rebuiltCount: 200 },
    { chunkCount: 205, rebuiltCount: 205 },
  ]);
  assert.deepEqual(repository.calls.updateFallbackEmbeddings[0]?.slice(0, 2), [
    { id: 'chunk-0', embedding: [1, 0] },
    { id: 'chunk-1', embedding: [1, 1] },
  ]);
  assert.deepEqual(repository.calls.updateFallbackEmbeddings.at(-1), [
    { id: 'chunk-200', embedding: [3, 0] },
    { id: 'chunk-201', embedding: [3, 1] },
    { id: 'chunk-202', embedding: [3, 2] },
    { id: 'chunk-203', embedding: [3, 3] },
    { id: 'chunk-204', embedding: [3, 4] },
  ]);
});

test('RebuildFallbackEmbeddingsUseCase throws when pages do not match count', async () => {
  const repository = createRepository([createChunk(0)], { count: 2 });
  const useCase = new RebuildFallbackEmbeddingsUseCase(
    repository,
    repository,
    createEmbeddingProvider(texts => texts.map((_, index) => [index]))
  );

  await assert.rejects(() => useCase.execute(), /Expected to rebuild 2 chunks, rebuilt 1/u);
});

function createChunk(index: number): RagChunkRecord {
  return {
    id: `chunk-${index}`,
    sourceId: 'source-id',
    chunkIndex: index,
    content: `Chunk ${index}`,
    metadata: {},
  };
}

function createRepository(chunks: RagChunkRecord[], options: { count?: number } = {}) {
  const calls = {
    clearFallbackEmbeddings: 0,
    listPage: [] as Array<{ offset: number; pageSize: number }>,
    updateFallbackEmbeddings: [] as RagChunkFallbackEmbeddingUpdate[][],
  };

  return {
    calls,
    async findBySourceId() {
      return [];
    },
    async findFirstBySourceIds() {
      return [];
    },
    async count() {
      return options.count ?? chunks.length;
    },
    async listPage(offset: number, pageSize: number) {
      calls.listPage.push({ offset, pageSize });
      return chunks.slice(offset, offset + pageSize);
    },
    async replaceForSource() {},
    async clearFallbackEmbeddings() {
      calls.clearFallbackEmbeddings += 1;
    },
    async updateFallbackEmbeddings(updates: RagChunkFallbackEmbeddingUpdate[]) {
      calls.updateFallbackEmbeddings.push(updates);
    },
  } satisfies IRagChunkReadRepository & IRagChunkWriteRepository & { calls: typeof calls };
}

function createEmbeddingProvider(
  embedTexts: (texts: string[]) => number[][] | Promise<number[][]>
): IEmbeddingProvider {
  return {
    async embedText(text) {
      const [embedding] = await embedTexts([text]);
      return embedding;
    },
    async embedTexts(texts) {
      return embedTexts(texts);
    },
  };
}
