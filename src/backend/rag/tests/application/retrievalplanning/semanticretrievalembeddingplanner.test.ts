import assert from 'node:assert/strict';
import test from 'node:test';

import { EmbeddingQuotaExceededError } from '../../../application/ports/providererrors.js';
import { SemanticEmbeddingResolver } from '../../../application/retrieval/embeddingresolver.js';
import { SemanticRetrievalEmbeddingPlanner } from '../../../application/retrievalplanning/createsemanticembeddings.js';
import type { IRoutedRetrievalItem } from '../../../domain/routing/retrievalitems.js';
import type { RetrievalRouteKind } from '../../../domain/routing/retrievalroute.types.js';
import { createFakeEmbeddingProvider } from '../../fakes/fakeembedding.provider.js';

test('SemanticRetrievalEmbeddingPlanner batches only semantic retrieval items', async () => {
  const embeddedTexts: string[][] = [];
  const planner = createPlanner(texts => {
    embeddedTexts.push(texts);
    return texts.map((_, index) => [index + 1]);
  });
  const items = [
    item('Latest articles', 'blog', { blogKind: 'latest' }),
    item('Team culture evidence', 'direct_evidence', { subject: 'team culture' }),
    item('Pricing', 'commercial_delivery'),
    item('GitHub link', 'link_action'),
    item('About this page', 'company_services', { forceFirstChunks: true, sourceKeys: ['about'] }),
    item('React evidence', 'direct_evidence', { subject: 'React' }),
    item('Top client examples', 'portfolio_work', { subject: 'top client projects' }),
    item('Who is Jose?', 'people', { requiresPersonClarification: true }),
    item('Blog follow-up', 'blog', { blogKind: 'answer' }),
  ];

  const embeddings = await planner.createEmbeddings(items);

  assert.deepEqual(embeddedTexts, [['Team culture evidence', 'Blog follow-up']]);
  assert.deepEqual([...embeddings.entries()], [
    [1, { embedding: [1], index: 'primary' }],
    [8, { embedding: [2], index: 'primary' }],
  ]);
});

test('SemanticRetrievalEmbeddingPlanner uses fallback embeddings after primary quota exhaustion', async () => {
  let fallbackTexts: string[] = [];
  const resolver = new SemanticEmbeddingResolver(
    createFakeEmbeddingProvider(() => {
      throw new EmbeddingQuotaExceededError('test quota', 'primary-model');
    }),
    createFakeEmbeddingProvider(texts => {
      fallbackTexts = texts;
      return texts.map((_, index) => [0.5, index]);
    })
  );
  const planner = new SemanticRetrievalEmbeddingPlanner(resolver);

  const embeddings = await planner.createEmbeddings([
    item('Team culture evidence', 'direct_evidence', { subject: 'team culture' }),
    item('Latest articles', 'blog', { blogKind: 'latest' }),
    item('Technical article', 'blog', { blogKind: 'answer' }),
  ]);

  assert.deepEqual(fallbackTexts, ['Team culture evidence', 'Technical article']);
  assert.deepEqual([...embeddings.entries()], [
    [0, { embedding: [0.5, 0], index: 'fallback' }],
    [2, { embedding: [0.5, 1], index: 'fallback' }],
  ]);
});

function createPlanner(embedTexts: (texts: string[]) => number[][]) {
  const provider = createFakeEmbeddingProvider(embedTexts);
  return new SemanticRetrievalEmbeddingPlanner(new SemanticEmbeddingResolver(provider, provider));
}

function item(
  retrievalQuestion: string,
  kind: RetrievalRouteKind,
  options: Partial<IRoutedRetrievalItem['route'] & IRoutedRetrievalItem['plan']> = {}
): IRoutedRetrievalItem {
  return {
    retrievalQuestion,
    plan: {
      query: retrievalQuestion,
      mode: kind === 'blog' ? 'article_discovery' : 'direct_evidence',
      entity: options.entity ?? '',
      subject: options.subject ?? '',
    },
    route: {
      kind,
      firstPartySourceTypes: null,
      entity: options.entity ?? '',
      subject: options.subject ?? '',
      ...(options.sourceKeys ? { sourceKeys: options.sourceKeys } : {}),
      ...(options.forceFirstChunks ? { forceFirstChunks: options.forceFirstChunks } : {}),
      ...(options.blogKind ? { blogKind: options.blogKind } : {}),
      ...(options.requiresPersonClarification
        ? { requiresPersonClarification: options.requiresPersonClarification }
        : {}),
    },
  };
}
