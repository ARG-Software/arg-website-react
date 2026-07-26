import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiEmbeddingQuotaError } from '../../clients/gemini.js';
import { ingestSource } from '../../ingestion/ingestPipeline.js';
import { redactCvContent } from '../../ingestion/processing/redaction.js';
import { createSourceHash } from '../../ingestion/processing/text.js';
import type { RagSourceRepository } from '../../core/types/ingestion.js';
import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { RagSource } from '../../core/types/source.js';

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

test('fallback quota exhaustion persists primary embeddings', async () => {
  let upserts = 0;
  const primaryProvider = createProvider(() => [[0.5, 0.6]]);
  const fallbackProvider = createProvider(() => {
    throw new GeminiEmbeddingQuotaError('fallback-model');
  });
  const repository = createRepository({
    upsertSource: async (sourceWithChunks, embeddings) => {
      upserts += 1;
      assert.deepEqual(sourceWithChunks.chunks, [source.content]);
      assert.deepEqual(embeddings, { primary: [[0.5, 0.6]], fallback: null });
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
  assert.equal(upserts, 1);
});

test('metadata changes re-ingest a source even when its content is unchanged', async () => {
  let upserts = 0;
  const sourceWithPerson = { ...source, metadata: { person_key: 'jose' } };
  const repository = createRepository({
    getSourceContentHash: async () => createSourceHash(source),
    upsertSource: async () => {
      upserts += 1;
      return { sourceId: 'source-id', chunkCount: 1 };
    },
  });

  const result = await ingestSource({
    source: sourceWithPerson,
    embeddingProvider: createProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createProvider(() => [[0.1, 0.2]]),
    repository,
  });

  assert.equal(result.skipped, false);
  assert.equal(upserts, 1);
});

test('CV redaction removes personal data while preserving professional content', () => {
  const redacted = redactCvContent(`
    José Antunes
    Software Architect
    Email: jose@example.com
    Phone: +351 912 345 678
    Address: Rua Example 123, Porto
    Location: Porto, Portugal
    Date of Birth: 1988-01-01
    Nationality: Portuguese
    Marital Status: Private
    LinkedIn: https://linkedin.com/in/example
    GitHub: @example
    Website: www.example.dev

    Professional Experience
    Backend architecture with C#, Python, distributed systems, and technical leadership.
  `);

  assert.match(redacted, /José Antunes/);
  assert.match(redacted, /Professional Experience/);
  assert.match(redacted, /Backend architecture with C#, Python/);
  assert.doesNotMatch(redacted, /jose@example\.com/);
  assert.doesNotMatch(redacted, /\+351/);
  assert.doesNotMatch(redacted, /Rua Example/);
  assert.doesNotMatch(redacted, /Porto, Portugal/);
  assert.doesNotMatch(redacted, /1988-01-01/);
  assert.doesNotMatch(redacted, /Portuguese/);
  assert.doesNotMatch(redacted, /linkedin\.com/);
  assert.doesNotMatch(redacted, /@example/);
  assert.doesNotMatch(redacted, /www\.example\.dev/);
});

test('CV redaction removes configured personal-data literals', () => {
  const redacted = redactCvContent('Professional summary. Sensitive private token.', [
    'Sensitive private token',
  ]);

  assert.match(redacted, /Professional summary/);
  assert.doesNotMatch(redacted, /Sensitive private token/i);
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
