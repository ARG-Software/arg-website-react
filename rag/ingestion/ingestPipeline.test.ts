import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiEmbeddingQuotaError } from '../clients/gemini.js';
import { ingestSource } from './ingestPipeline.js';
import type { EmbeddingProvider } from '../types/ai.js';
import type { RagSourceRepository } from '../types/ingestion.js';
import type { RagSource } from '../types/source.js';

const source: RagSource = {
  sourceType: 'blog_post',
  sourceKey: 'fallback-test',
  title: 'Fallback test',
  origin: 'first_party',
  isPublic: true,
  content: 'A source that requires one embedding chunk.',
};

test('fallback-only ingestion bypasses unchanged content and never invokes the primary provider', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  let hashLookups = 0;
  let fallbackUpdates = 0;
  let upserts = 0;
  const primaryProvider = createProvider(() => {
    primaryCalls += 1;
    throw new Error('Primary provider must not be called');
  });
  const fallbackProvider = createProvider(() => {
    fallbackCalls += 1;
    return [[0.1, 0.2]];
  });
  const repository = createRepository({
    getSourceContentHash: async () => {
      hashLookups += 1;
      return 'unchanged';
    },
    upsertSource: async () => {
      upserts += 1;
      return { sourceId: 'source-id', chunkCount: 1 };
    },
    updateFallbackEmbeddings: async (_source, embeddings) => {
      fallbackUpdates += 1;
      assert.deepEqual(embeddings, [[0.1, 0.2]]);
      return { sourceId: 'source-id', chunkCount: 1 };
    },
  });

  const result = await ingestSource({
    source,
    fallbackOnly: true,
    embeddingProvider: primaryProvider,
    fallbackEmbeddingProvider: fallbackProvider,
    repository,
  });

  assert.equal(result.skipped, false);
  assert.equal(primaryCalls, 0);
  assert.equal(fallbackCalls, 1);
  assert.equal(hashLookups, 0);
  assert.equal(fallbackUpdates, 1);
  assert.equal(upserts, 0);
});

test('primary quota exhaustion persists fallback embeddings', async () => {
  let fallbackCalls = 0;
  let fallbackUpdates = 0;
  let upserts = 0;
  const primaryProvider = createProvider(() => {
    throw new GeminiEmbeddingQuotaError('primary-model');
  });
  const fallbackProvider = createProvider(() => {
    fallbackCalls += 1;
    return [[0.3, 0.4]];
  });
  const repository = createRepository({
    updateFallbackEmbeddings: async (sourceWithChunks, embeddings) => {
      fallbackUpdates += 1;
      assert.deepEqual(sourceWithChunks.chunks, [source.content]);
      assert.deepEqual(embeddings, [[0.3, 0.4]]);
      return { sourceId: 'source-id', chunkCount: 1 };
    },
    upsertSource: async () => {
      upserts += 1;
      return { sourceId: 'source-id', chunkCount: 1 };
    },
  });

  const result = await ingestSource({
    source,
    embeddingProvider: primaryProvider,
    fallbackEmbeddingProvider: fallbackProvider,
    repository,
  });

  assert.equal(result.skipped, false);
  assert.equal(fallbackCalls, 1);
  assert.equal(fallbackUpdates, 1);
  assert.equal(upserts, 0);
});

function createProvider(embedTexts: (texts: string[]) => number[][] | Promise<number[][]>): EmbeddingProvider {
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

function createRepository(overrides: Partial<RagSourceRepository>): RagSourceRepository {
  return {
    getSourceContentHash: async () => null,
    upsertSource: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    updateFallbackEmbeddings: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    ...overrides,
  };
}
