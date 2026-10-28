import assert from 'node:assert/strict';
import test from 'node:test';

import { createArticleRecommendations } from '../../../../../../../src/backend/rag/application/answering/recommendations.js';
import { loadPatternSources } from '../../../../../../../src/backend/rag/infrastructure/ingestion/loaders/loadpatternsources.js';
import type { IRetrievedContext } from '../../../../../../../src/backend/rag/domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../../../../../src/backend/rag/domain/routing/retrievalroute.types.js';

const PATTERNS_PATH = 'src/frontend/content/patterns';
const BLOG_PATH = 'src/frontend/content/blog';

test('pattern sources are site pages keyed and linked by pattern slug', async () => {
  const sources = await loadPatternSources(process.cwd(), PATTERNS_PATH, BLOG_PATH);
  const cqrs = sources.find(source => source.sourceKey === 'pattern-cqrs');

  assert.equal(sources.length, 10);
  assert.ok(sources.every(source => source.sourceType === 'homepage'));
  assert.ok(cqrs);
  assert.equal(cqrs.url, '/patterns/cqrs/');
  assert.match(cqrs.content, /^Architecture pattern\nTitle: CQRS Pattern\n/u);
  assert.match(cqrs.content, /Related ARG articles: .+ \(\/blog\/cqrs-without-mediatr\/\)/u);
  assert.doesNotMatch(cqrs.content, /undefined/u);
});

test('pattern file selection loads only the selected pattern', async () => {
  const sources = await loadPatternSources(process.cwd(), PATTERNS_PATH, BLOG_PATH, {
    all: false,
    force: false,
    fallbackOnly: false,
    sourceKeys: [],
    filePaths: [`${PATTERNS_PATH}/saga.md`],
    urls: [],
  });

  assert.deepEqual(
    sources.map(source => source.sourceKey),
    ['pattern-saga']
  );
});

test('a retrieved pattern recommends the articles in its relatedPosts', async () => {
  const [pattern] = await loadPatternSources(process.cwd(), PATTERNS_PATH, BLOG_PATH, {
    all: false,
    force: false,
    fallbackOnly: false,
    sourceKeys: [],
    filePaths: [`${PATTERNS_PATH}/circuit-breaker.md`],
    urls: [],
  });
  const context = {
    sourceType: pattern.sourceType,
    sourceKey: pattern.sourceKey,
    title: pattern.title,
    url: pattern.url,
    origin: 'first_party',
    sourceMetadata: pattern.metadata ?? {},
  } as IRetrievedContext;

  const recommendations = createArticleRecommendations(
    [context],
    { kind: 'direct_evidence' } as IRetrievalRoute,
    'https://arg.software'
  );

  assert.deepEqual(
    recommendations.map(recommendation => recommendation.url),
    ['https://arg.software/blog/circuit-breaker-pattern-aspnet-core/']
  );
});
