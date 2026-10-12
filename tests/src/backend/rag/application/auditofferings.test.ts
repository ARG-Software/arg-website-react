import assert from 'node:assert/strict';
import test from 'node:test';

import { chunkText } from '../../../../../src/backend/rag/application/ingestion/processing/chunking.js';
import { getKnownProjectNames } from '../../../../../src/backend/rag/application/config/sourcecatalog.config.js';
import { createAssistantActions } from '../../../../../src/backend/rag/domain/assistant/actions.js';
import { getAssistantPolicyInstructions } from '../../../../../src/backend/rag/domain/assistant/assistantpolicy.js';
import type { IRetrievalPlan } from '../../../../../src/backend/rag/domain/routing/retrievalplan.types.js';
import { resolveRetrievalRoute } from '../../../../../src/backend/rag/domain/routing/retrievalroute.js';
import { loadAuditSources } from '../../../../../src/backend/rag/infrastructure/ingestion/loaders/loadauditsources.js';
import { createAssistantUseCases } from '../fakes/createassistantusecases.js';
import { createFakeAnswerProvider } from '../fakes/fakeanswer.provider.js';
import { createFakeEmbeddingProvider } from '../fakes/fakeembedding.provider.js';
import { FakeRagReadRepository } from '../fakes/fakeragread.repository.js';
import { createTestConfig } from '../fixtures/config.js';
import { createContextFixture } from '../fixtures/contexts.js';
import { createChunkFixture, createSourceFixture } from '../fixtures/sources.js';

const AUDIT_SOURCE_KEYS = ['arg-architect', 'architecture-review', 'pricing-overview'];

function route(question: string, mode: IRetrievalPlan['mode'] = 'direct_evidence', subject = '') {
  return resolveRetrievalRoute(question, { mode, entity: '', subject }, getKnownProjectNames());
}

function createAuditRepository(contexts: ReturnType<typeof createContextFixture>[] = []) {
  return new FakeRagReadRepository({
    sources: [
      createSourceFixture('architect-id', 'ARG Architect', null, 'working_with_us', 'arg-architect'),
      createSourceFixture('review-id', 'Architecture Review', null, 'working_with_us', 'architecture-review'),
      createSourceFixture('pricing-id', 'ARG Pricing Overview', null, 'working_with_us', 'pricing-overview'),
      createSourceFixture('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq'),
    ],
    chunks: [
      createChunkFixture('architect-id', 'architect', 'ARG Architect is a free browser extension.'),
      createChunkFixture('review-id', 'review', 'Architecture Review: from EUR 3,500 for one week.'),
      createChunkFixture('pricing-id', 'pricing', 'ARG Software pricing overview.'),
      createChunkFixture('faq-id', 'faq', 'Project budgets usually start around EUR 10,000.'),
    ],
    contexts,
  });
}

test('audit and extension questions use the audit offerings route', () => {
  const questions = [
    'How much does the audit cost?',
    'Is the browser extension free?',
    'Where can I install ARG Architect?',
    'How do I book an architecture call?',
    'What is not included in the architecture review?',
    'Does the extension track me or send my data anywhere?',
    'Tell me about the extension',
    'Do you do audits?',
  ];

  for (const question of questions) {
    const result = route(question);

    assert.equal(result.kind, 'audit_offerings', question);
    assert.deepEqual(result.sourceKeys, AUDIT_SOURCE_KEYS, question);
  }
});

test('similarly named things do not use the audit offerings route', () => {
  assert.notEqual(route('What is arg-web-audit?').kind, 'audit_offerings');
  assert.notEqual(route('How do I install arg-browser-extension?').kind, 'audit_offerings');
  assert.notEqual(route('Tell me about senior team extension').kind, 'audit_offerings');
  assert.notEqual(route('Can you build a Chrome extension for us?').kind, 'audit_offerings');
  assert.notEqual(route('How should a team audit its dependencies?', 'editorial').kind, 'audit_offerings');
});

test('article questions about audits stay on the blog route', () => {
  assert.equal(route('Do you have articles about website audits?', 'article_discovery').kind, 'blog');
  assert.equal(route('What have you written about auditing?').kind, 'blog');
});

test('pricing questions without an offering keep the general pricing route', () => {
  const result = route('How much do you charge?', 'direct_evidence', 'pricing');

  assert.equal(result.kind, 'commercial_delivery');
  assert.equal(result.commercialKind, 'general_pricing');
});

test('audit offerings retrieval returns the three summaries plus matching detail', async () => {
  const repository = createAuditRepository([
    createContextFixture(
      'working_with_us',
      'arg-architect',
      'ARG Architect',
      'ARG Architect Security category: checks the security headers the server sends.'
    ),
  ]);
  const useCases = createAssistantUseCases({
    config: createTestConfig({ matchCount: 1 }),
    readRepository: repository,
    answerProvider: createFakeAnswerProvider('Audit answer', {
      plan: { mode: 'direct_evidence', entity: 'ARG Architect', subject: 'security checks' },
    }),
    embeddingProvider: createFakeEmbeddingProvider(async texts => texts.map(() => [0.1, 0.2])),
  });

  const contexts = await useCases.retrieveRelevantChunksUseCase.execute({
    question: 'What does ARG Architect check for security?',
  });

  assert.deepEqual(
    contexts.slice(0, 3).map(context => context.sourceKey),
    AUDIT_SOURCE_KEYS
  );
  assert.match(contexts[3]?.content ?? '', /Security category/u);
});

test('the summary of the best matching audit source leads so it is the one cited', async () => {
  const repository = createAuditRepository([
    createContextFixture(
      'working_with_us',
      'architecture-review',
      'Architecture Review',
      'Architecture review, not included: a pentest.'
    ),
  ]);
  const useCases = createAssistantUseCases({
    config: createTestConfig({ matchCount: 1 }),
    readRepository: repository,
    answerProvider: createFakeAnswerProvider('Review answer', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'architecture review scope' },
    }),
    embeddingProvider: createFakeEmbeddingProvider(async texts => texts.map(() => [0.1, 0.2])),
  });

  const contexts = await useCases.retrieveRelevantChunksUseCase.execute({
    question: 'What is not included in the architecture review?',
  });

  assert.equal(contexts[0]?.sourceKey, 'architecture-review');
});

test('architecture call questions offer the architecture call action', () => {
  assert.deepEqual(createAssistantActions('How do I book an architecture call?'), [
    { type: 'book_architecture_call' },
    { type: 'gaspar_message' },
  ]);
  assert.deepEqual(createAssistantActions('Can I book a meeting?', 'explicit_contact_request')[1], {
    type: 'book_meeting',
  });
});

test('general pricing retrieval puts the pricing overview before the FAQ budget', async () => {
  const repository = createAuditRepository();
  const useCases = createAssistantUseCases({
    config: createTestConfig({ matchCount: 1 }),
    readRepository: repository,
    answerProvider: createFakeAnswerProvider('Pricing answer', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'pricing' },
    }),
    embeddingProvider: createFakeEmbeddingProvider(() => {
      throw new Error('Embeddings must not be generated for general pricing');
    }),
  });

  const contexts = await useCases.retrieveRelevantChunksUseCase.execute({
    question: 'How much do you charge?',
  });

  assert.deepEqual(
    contexts.map(context => context.sourceKey),
    ['pricing-overview', 'faq']
  );
});

test('audit page loads as separate extension, review, and pricing sources', async () => {
  const sources = await loadAuditSources(process.cwd(), 'src/frontend/data/auditPage.json');
  const [architect, review, pricing] = sources;

  assert.deepEqual(
    sources.map(source => source.sourceKey),
    AUDIT_SOURCE_KEYS
  );

  const architectSummary = chunkText(architect.content)[0];
  assert.match(architectSummary, /ARG Architect is ARG Software's free browser extension/u);
  assert.match(architectSummary, /chromewebstore\.google\.com/u);
  assert.match(architectSummary, /addons\.mozilla\.org/u);
  assert.doesNotMatch(architect.content, /\/images\/|undefined/u);

  const reviewSummary = chunkText(review.content)[0];
  assert.match(reviewSummary, /from €3,500/u);
  assert.match(reviewSummary, /zcal\.co\/argsoftware\/architecture-call/u);
  assert.match(review.content, /not included: anything outside the agreed scope/u);
  assert.doesNotMatch(review.content, /undefined/u);

  assert.equal(chunkText(pricing.content).length, 1);
  assert.match(pricing.content, /ARG Architect browser extension: Free/u);
  assert.match(pricing.content, /Architecture review: from €3,500/u);
  assert.match(pricing.content, /Custom software and product delivery: Project budgets usually start around EUR 10,000/u);
});

test('assistant policy separates audit offerings and their prices', () => {
  const instructions = getAssistantPolicyInstructions().join('\n');

  assert.match(instructions, /Senior Team Extension is a staffing service/u);
  assert.match(instructions, /never apply the price of one offering to another/u);
  assert.match(instructions, /Never take ARG Architect features, Architecture Review scope, or prices from a blog article/u);
});
