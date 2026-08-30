import assert from 'node:assert/strict';
import test from 'node:test';

import { EmbeddingQuotaExceededError } from '../../application/ports/providererrors.js';
import { IngestSourceUseCase } from '../../application/usecases/ingestion/ingestsource.usecase.js';
import { redactCvContent } from '../../application/ingestion/processing/redaction.js';
import { createSourceHash } from '../../application/ingestion/processing/text.js';
import { createFakeEmbeddingProvider as createProvider } from '../fakes/fakeembedding.provider.js';
import { createFakeRagRepositories as createRepository } from '../fakes/fakerag.repository.js';
import type { IRagSource } from '../../domain/sources/ragsource.types.js';

const source: IRagSource = {
  sourceType: 'blog_post',
  sourceKey: 'fallback-test',
  title: 'Fallback test',
  origin: 'first_party',
  isPublic: true,
  content: 'A source that requires one embedding chunk.',
};

test('source hashes ignore local provenance paths', () => {
  const windowsSource = {
    ...source,
    path: 'C:\\Work\\Arg\\Website-React\\src\\frontend\\blog\\post.md',
    metadata: {
      tag: 'Engineering',
      source_file: 'C:\\Work\\Arg\\Website-React\\src\\frontend\\blog\\post.md',
      source_files: ['C:\\Work\\Arg\\Website-React\\src\\frontend\\data\\about.json'],
    },
  };
  const linuxSource = {
    ...source,
    path: '/opt/build/repo/src/frontend/blog/post.md',
    metadata: {
      tag: 'Engineering',
      source_file: '/opt/build/repo/src/frontend/blog/post.md',
      source_files: ['/opt/build/repo/src/frontend/data/about.json'],
    },
  };

  assert.equal(createSourceHash(windowsSource), createSourceHash(linuxSource));
});

test('source hashes still include retrieval metadata', () => {
  assert.notEqual(
    createSourceHash({ ...source, metadata: { person_key: 'jose' } }),
    createSourceHash({ ...source, metadata: { person_key: 'rui' } })
  );
});

test('fallback-only ingestion bypasses unchanged content and never invokes the primary provider', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  let sourceLookups = 0;
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
    sourceRepository: {
      findByKey: async () => {
        sourceLookups += 1;
        return createExistingSource();
      },
      upsert: async () => {
        upserts += 1;
        return 'source-id';
      },
    },
    chunkRepository: {
      findBySourceId: async () => [{
        id: 'chunk-id',
        sourceId: 'source-id',
        chunkIndex: 0,
        content: source.content,
        metadata: {},
      }],
      updateFallbackEmbeddings: async updates => {
        fallbackUpdates += 1;
        assert.deepEqual(updates, [{ id: 'chunk-id', embedding: [0.1, 0.2] }]);
      },
    },
  });

  const result = await createUseCase(repository, primaryProvider, fallbackProvider).execute({
    source,
    fallbackOnly: true,
  });

  assert.equal(result.skipped, false);
  assert.equal(primaryCalls, 0);
  assert.equal(fallbackCalls, 1);
  assert.equal(sourceLookups, 1);
  assert.equal(fallbackUpdates, 1);
  assert.equal(upserts, 0);
});

test('primary quota exhaustion persists fallback embeddings', async () => {
  let fallbackCalls = 0;
  let fallbackUpdates = 0;
  let upserts = 0;
  let sourceLookups = 0;
  const primaryProvider = createProvider(() => {
    throw new EmbeddingQuotaExceededError('test', 'primary-model');
  });
  const fallbackProvider = createProvider(() => {
    fallbackCalls += 1;
    return [[0.3, 0.4]];
  });
  const repository = createRepository({
    sourceRepository: {
      findByKey: async () => {
        sourceLookups += 1;
        return sourceLookups === 1 ? null : createExistingSource();
      },
      upsert: async () => {
        upserts += 1;
        return 'source-id';
      },
    },
    chunkRepository: {
      findBySourceId: async () => [{
        id: 'chunk-id',
        sourceId: 'source-id',
        chunkIndex: 0,
        content: source.content,
        metadata: {},
      }],
      updateFallbackEmbeddings: async updates => {
        fallbackUpdates += 1;
        assert.deepEqual(updates, [{ id: 'chunk-id', embedding: [0.3, 0.4] }]);
      },
    },
  });

  const result = await createUseCase(repository, primaryProvider, fallbackProvider).execute({ source });

  assert.equal(result.skipped, false);
  assert.equal(fallbackCalls, 1);
  assert.equal(fallbackUpdates, 1);
  assert.equal(upserts, 0);
});

test('fallback quota exhaustion persists primary embeddings', async () => {
  let upserts = 0;
  const primaryProvider = createProvider(() => [[0.5, 0.6]]);
  const fallbackProvider = createProvider(() => {
    throw new EmbeddingQuotaExceededError('test', 'fallback-model');
  });
  const repository = createRepository({
    chunkRepository: {
      replaceForSource: async (_sourceId, chunks) => {
        upserts += 1;
        assert.deepEqual(chunks.map(chunk => chunk.content), [source.content]);
        assert.deepEqual(chunks.map(chunk => chunk.embedding), [[0.5, 0.6]]);
        assert.deepEqual(chunks.map(chunk => chunk.fallbackEmbedding), [null]);
      },
    },
  });

  const result = await createUseCase(repository, primaryProvider, fallbackProvider).execute({ source });

  assert.equal(result.skipped, false);
  assert.equal(upserts, 1);
});

test('metadata changes re-ingest a source even when its content is unchanged', async () => {
  let upserts = 0;
  const sourceWithPerson = { ...source, metadata: { person_key: 'jose' } };
  const repository = createRepository({
    sourceRepository: {
      findByKey: async () => ({
        id: 'source-id',
        sourceType: source.sourceType,
        sourceKey: source.sourceKey,
        title: source.title,
        url: null,
        path: null,
        origin: source.origin,
        isPublic: source.isPublic,
        metadata: source.metadata ?? {},
        contentHash: createSourceHash(source),
      }),
    },
    chunkRepository: {
      replaceForSource: async () => {
        upserts += 1;
      },
    },
  });

  const result = await createUseCase(
    repository,
    createProvider(() => [[0.1, 0.2]]),
    createProvider(() => [[0.1, 0.2]])
  ).execute({ source: sourceWithPerson });

  assert.equal(result.skipped, false);
  assert.equal(upserts, 1);
});

test('empty content is skipped before repository or provider calls', async () => {
  let repositoryCalled = false;
  let providerCalled = false;
  const repository = createRepository({
    sourceRepository: {
      findByKey: async () => {
        repositoryCalled = true;
        return null;
      },
      upsert: async () => {
        repositoryCalled = true;
        return 'source-id';
      },
    },
    chunkRepository: {
      replaceForSource: async () => {
        repositoryCalled = true;
      },
    },
  });

  const result = await createUseCase(
    repository,
    createProvider(() => {
      providerCalled = true;
      return [];
    }),
    createProvider(() => {
      providerCalled = true;
      return [];
    })
  ).execute({ source: { ...source, content: ' \n\t ' } });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'empty_content');
  assert.equal(repositoryCalled, false);
  assert.equal(providerCalled, false);
});

test('dry runs return planned chunks without embedding or writing', async () => {
  let providerCalled = false;
  let upserts = 0;
  const repository = createRepository({
    chunkRepository: {
      replaceForSource: async () => {
        upserts += 1;
      },
    },
  });

  const result = await createUseCase(
    repository,
    createProvider(() => {
      providerCalled = true;
      return [];
    }),
    createProvider(() => {
      providerCalled = true;
      return [];
    })
  ).execute({ source, dryRun: true });

  assert.equal(result.skipped, false);
  assert.equal(result.dryRun, true);
  assert.equal(result.chunkCount, 1);
  assert.equal(providerCalled, false);
  assert.equal(upserts, 0);
});

test('force re-ingests unchanged content', async () => {
  let upserts = 0;
  const repository = createRepository({
    sourceRepository: {
      findByKey: async () => createExistingSource(),
    },
    chunkRepository: {
      replaceForSource: async (_sourceId, chunks) => {
        upserts += 1;
        assert.deepEqual(chunks.map(chunk => chunk.embedding), [[0.1, 0.2]]);
        assert.deepEqual(chunks.map(chunk => chunk.fallbackEmbedding), [[0.3, 0.4]]);
      },
    },
  });

  const result = await createUseCase(
    repository,
    createProvider(() => [[0.1, 0.2]]),
    createProvider(() => [[0.3, 0.4]])
  ).execute({ source, force: true });

  assert.equal(result.skipped, false);
  assert.equal(upserts, 1);
});

test('embedding count mismatches throw before writes', async () => {
  let fallbackCalls = 0;
  let upserts = 0;
  const repository = createRepository({
    sourceRepository: {
      upsert: async () => {
        upserts += 1;
        return 'source-id';
      },
    },
    chunkRepository: {
      replaceForSource: async () => {
        upserts += 1;
      },
    },
  });

  await assert.rejects(
    () => createUseCase(
      repository,
      createProvider(() => []),
      createProvider(() => {
        fallbackCalls += 1;
        return [[0.3, 0.4]];
      })
    ).execute({ source }),
    /Expected 1 primary embeddings, received 0/u
  );

  assert.equal(fallbackCalls, 0);
  assert.equal(upserts, 0);
});

test('fallback-only ingestion replaces chunks when stored content differs', async () => {
  let fallbackUpdates = 0;
  let replacements = 0;
  const repository = createRepository({
    sourceRepository: {
      findByKey: async () => createExistingSource(),
    },
    chunkRepository: {
      findBySourceId: async () => [{
        id: 'old-chunk-id',
        sourceId: 'source-id',
        chunkIndex: 0,
        content: 'Old chunk content',
        metadata: {},
      }],
      updateFallbackEmbeddings: async () => {
        fallbackUpdates += 1;
      },
      replaceForSource: async (_sourceId, chunks) => {
        replacements += 1;
        assert.deepEqual(chunks.map(chunk => chunk.embedding), [null]);
        assert.deepEqual(chunks.map(chunk => chunk.fallbackEmbedding), [[0.7, 0.8]]);
        assert.deepEqual(chunks.map(chunk => chunk.metadata.char_count), [source.content.length]);
      },
    },
  });

  const result = await createUseCase(
    repository,
    createProvider(() => {
      throw new Error('Primary provider must not be called');
    }),
    createProvider(() => [[0.7, 0.8]])
  ).execute({ source, fallbackOnly: true });

  assert.equal(result.skipped, false);
  assert.equal(fallbackUpdates, 0);
  assert.equal(replacements, 1);
});

function createExistingSource() {
  return {
    id: 'source-id',
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    url: null,
    path: null,
    origin: source.origin,
    isPublic: source.isPublic,
    metadata: source.metadata ?? {},
    contentHash: createSourceHash(source),
  };
}

function createUseCase(
  repository: ReturnType<typeof createRepository>,
  primaryProvider: ReturnType<typeof createProvider>,
  fallbackProvider: ReturnType<typeof createProvider>
) {
  return new IngestSourceUseCase(
    repository.sourceRepository,
    repository.sourceRepository,
    repository.chunkRepository,
    repository.chunkRepository,
    primaryProvider,
    fallbackProvider
  );
}

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

