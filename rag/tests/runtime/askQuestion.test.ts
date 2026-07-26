import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiEmbeddingQuotaError } from '../../clients/gemini.js';
import { createFakeAnswerProvider as createAnswerProvider } from '../fakes/FakeAnswerProvider.js';
import { createFakeEmbeddingProvider as createEmbeddingProvider } from '../fakes/FakeEmbeddingProvider.js';
import { FakeRagReadRepository } from '../fakes/FakeRagReadRepository.js';
import { createContextFixture as matchRow } from '../fixtures/contexts.js';
import { createTestConfig } from '../fixtures/config.js';
import { createChunkFixture as chunk, createSourceFixture as source } from '../fixtures/sources.js';
import { buildInsufficientContextPrompt } from '../../prompts/insufficientContext.js';
import { askQuestion, retrieveRelevantChunks, resolveRetrievalRoute } from '../../runtime/askQuestion.js';

const config = createTestConfig({ matchCount: 1 });

test('latest articles retrieve the newest three dated blog posts without embeddings', async () => {
  const sources = [
    source('old', 'Old post', 'June 1, 2026'),
    source('newest', 'Newest post', 'July 3, 2026'),
    source('middle', 'Middle post', 'July 2, 2026'),
    source('third', 'Third post', 'July 1, 2026'),
    source('invalid', 'Invalid post', null),
  ];
  const chunks = sources.map(item => chunk(item.id, item.sourceKey));
  const supabase = createSupabase({ sources, chunks });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for latest posts');
  });

  const result = await askQuestion({
    question: 'Latest articles?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Latest blog posts', {
      plan: { mode: 'article_discovery', entity: '', subject: 'articles' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['newest', 'middle', 'third']);
  assert.deepEqual(result.articleRecommendations.map(article => article.title), [
    'Newest post',
    'Middle post',
    'Third post',
  ]);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('an article-discovery plan uses the latest-blog route', () => {
  assert.equal(
    resolveRetrievalRoute('What are the most recent blog posts?', {
      mode: 'article_discovery',
      entity: '',
      subject: 'blog posts',
    }).kind,
    'latest_blog'
  );
});

test('a follow-up about an article uses editorial route and retrieves blog content', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'blog_post',
        'the-stack-nobody-hypes',
        'The Stack Nobody Hypes',
        'Blog post\nTitle: The Stack Nobody Hypes\n.NET remains a strong choice for long-lived systems.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'what does the first one talk about?',
    messages: [
      {
        role: 'assistant',
        content:
          'Here are our latest articles:\nThe Stack Nobody Hypes, but Serious CTOs Keep Choosing (July 15, 2026)\nWhy Your JWT Implementation Probably Breaks (July 6, 2026)\nFrom Anemic Models to Behaviour-rich Aggregates (July 3, 2026)',
      },
    ],
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider(
      'what does The Stack Nobody Hypes, but Serious CTOs Keep Choosing talk about?',
      {
        plan: { mode: 'editorial', entity: '', subject: '' },
      }
    ),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceType, 'blog_post');
  assert.equal(result.contexts[0]?.sourceKey, 'the-stack-nobody-hypes');
  assert.equal(
    resolveRetrievalRoute(
      'what does The Stack Nobody Hypes, but Serious CTOs Keep Choosing talk about?',
      { mode: 'editorial', entity: '', subject: '' }
    ).kind,
    'editorial'
  );
  assert.ok(result.answer.length > 0);
});

test('blog metadata remains retrievable through the general route', async () => {
  const supabase = createSupabase({
    rpcRows: [matchRow('blog_post', 'blog-post', 'Blog post', 'Blog post\nTitle: Blog post')],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you have blog posts?',
    retrievalQuestion: 'Do you have blog posts?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Do you have blog posts?', {
      plan: { mode: 'article_discovery', entity: '', subject: 'blog posts' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceType, 'blog_post');
  assert.match(contexts[0]?.content ?? '', /^Blog post/u);
  assert.deepEqual(supabase.calls.matchChunks[0]?.sourceTypes, ['blog_post']);
});

test('fintech questions use official project evidence before technical blog retrieval', async () => {
  const supabase = createSupabase({
    rpcRows: [matchRow('project', 'mojaloop', 'Mojaloop', 'Payment infrastructure evidence')],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Can you build AI for fintech?',
    retrievalQuestion: 'Can ARG Software build AI for fintech?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Can ARG Software build AI for fintech?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'AI for fintech' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(
    resolveRetrievalRoute('What experience do you have in fintech?', {
      mode: 'direct_evidence',
      entity: 'ARG Software',
      subject: 'fintech',
    }).kind,
    'direct_evidence'
  );
  assert.equal(contexts[0]?.sourceType, 'project');
  assert.deepEqual(supabase.calls.matchChunks[0]?.sourceTypes, [
    'homepage',
    'about',
    'project',
    'partner',
    'careers',
    'working_with_us',
  ]);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceTypes?.includes('faq')));
  assert.ok(
    supabase.calls.matchChunks.some(
      call => call.sourceTypes?.includes('external_page') && call.sourceOrigin === 'trusted_external'
    )
  );
});

test('a hybrid mode client-hiring question retrieves FAQ evidence and project actions', async () => {
  const faq = source('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq');
  const supabase = createSupabase({
    sources: [faq],
    chunks: [
      chunk(
        'faq-id',
        'faq',
        'ARG is remote-first. For hybrid mode, recurring on-site sessions, or a different collaboration rhythm, we assess the setup case by case.'
      ),
    ],
    rpcRows: [
      matchRow(
        'faq',
        'faq',
        'Frequently Asked Questions',
        'ARG is remote-first. Hybrid mode is assessed case by case.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => [[0.1, 0.2]]);

  const result = await askQuestion({
    question: 'But if I want to hire you guys can you work in a hybrid mode?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Can I hire ARG in hybrid mode?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'hybrid mode' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['faq']);
  assert.deepEqual(result.actions, [{ type: 'book_meeting' }, { type: 'email_hello' }]);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceTypes?.includes('faq')));
});

test('top referenced project questions retrieve ranked public project evidence', async () => {
  const sources = [
    source('home-projects-id', 'Homepage Projects', null, 'homepage', 'home:projects'),
    source('mojaloop-id', 'Mojaloop', null, 'project', 'mojaloop', { reference_rank: 1 }),
    source('pch-id', "People's Clearinghouse", null, 'project', 'peoples-clearinghouse', {
      reference_rank: 2,
    }),
    source('sky-tracks-id', 'Sky Tracks', null, 'project', 'sky-tracks', { reference_rank: 3 }),
    source('tv-cine-id', 'TV Cine', null, 'project', 'tv-cine'),
  ];
  const chunks = [
    chunk(
      'home-projects-id',
      'home-projects',
      'This is a public selection, not the full archive.'
    ),
    chunk('mojaloop-id', 'mojaloop', 'Mojaloop payment switch case study.'),
    chunk('pch-id', 'peoples-clearinghouse', "People's Clearinghouse public demo case study."),
    chunk('sky-tracks-id', 'sky-tracks', 'Sky Tracks music production case study.'),
    chunk('tv-cine-id', 'tv-cine', 'TV Cine entertainment platform case study.'),
  ];
  const supabase = createSupabase({ sources, chunks });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Project reference retrieval should not require embeddings');
  });

  const contexts = await retrieveRelevantChunks({
    question: 'What are the top referenced projects of Arg?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What are the top referenced projects of ARG Software?', {
      plan: { mode: 'direct_evidence', entity: 'Arg', subject: 'top referenced projects' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(contexts.map(context => context.sourceKey), [
    'home:projects',
    'mojaloop',
    'peoples-clearinghouse',
    'sky-tracks',
  ]);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('project reference questions do not use unconfirmed technology fallback', async () => {
  const result = await askQuestion({
    question: 'What are the top referenced projects of Arg?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('What are the top referenced projects of ARG Software?', {
      plan: { mode: 'direct_evidence', entity: 'Arg', subject: 'top referenced projects' },
      insufficientContextAnswer: 'Please send us a message so we can share relevant project references.',
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.doesNotMatch(result.answer, /usual or preferred stack/iu);
  assert.match(result.answer, /project references/iu);
});

test('a Go stack question does not treat go-to language wording as Go evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        "assistant response policy technology stack go to languages: ARG's go-to production languages are TypeScript, JavaScript, and C#."
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you know Go?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Go?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Go' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.deepEqual(contexts, []);
});

test('unconfirmed technology questions do not borrow preferred-stack evidence', async () => {
  const requestedTechnologies = ['Rust', 'Laravel', 'AWS', 'Svelte'];

  for (const technology of requestedTechnologies) {
    const supabase = createSupabase({
      rpcRows: [
        matchRow(
          'working_with_us',
          'assistant-policy',
          'Assistant Response Policy',
          "ARG's go-to production languages are TypeScript, JavaScript, and C#."
        ),
      ],
    });

    const contexts = await retrieveRelevantChunks({
      question: `Do you work with ${technology}?`,
      config,
      readRepository: supabase.repository,
      answerProvider: createAnswerProvider(`Does ARG Software use ${technology}?`, {
        plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: technology },
      }),
      embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
      fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    });

    assert.deepEqual(contexts, [], technology);
  }
});

test('insufficient technology prompt asks for adaptive rather than hard-denial wording', () => {
  const prompt = buildInsufficientContextPrompt('ARG Software', 'en');

  assert.match(prompt, /avoid hard rejection/u);
  assert.match(prompt, /do not lead with "we cannot confirm"/u);
  assert.match(prompt, /usual or preferred stack/u);
  assert.match(prompt, /right vehicle for the outcome/u);
  assert.match(prompt, /rather than a bottleneck/u);
});

test('unconfirmed single-technology answers use adaptive wording deterministically', async () => {
  const result = await askQuestion({
    question: 'Do you know Go?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('Does ARG Software use Go?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Go' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.match(result.answer, /^Go is not part of our usual or preferred stack\./u);
  assert.match(result.answer, /vehicle for the outcome, not a bottleneck/u);
  assert.match(result.answer, /we can assess and adapt/u);
});

test('a C# stack question retrieves explicit production-language evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        "ARG's go-to production languages are TypeScript, JavaScript, and C#."
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you know C#?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use C#?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'C#' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'assistant-policy');
});

test('technology support questions override editorial planner mistakes', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        "ARG's go-to production languages are TypeScript, JavaScript, and C#."
      ),
      matchRow('blog_post', 'csharp-blog', 'C# blog post', 'C# editorial article.'),
    ],
  });

  const result = await askQuestion({
    question: 'do you know C#?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What is C#?', {
      plan: { mode: 'editorial', entity: '', subject: 'C#' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.some(context => context.sourceKey === 'assistant-policy'));
  assert.ok(result.contexts.every(context => context.sourceType !== 'blog_post'));
  assert.deepEqual(result.articleRecommendations, []);
});

test('a Python stack question retrieves explicit conditional-use evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        'ARG also uses Python when it fits the problem, especially for AI, automation, data, scripting, and integration work.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you know Python?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Python?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Python' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'assistant-policy');
});

test('an Angular stack question retrieves explicit project evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'project',
        'sky-tracks',
        'Sky Tracks',
        'ARG migrated the frontend to Angular and implemented the redesigned product interface.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you know Angular?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Angular?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Angular' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'sky-tracks');
});

test('a .NET stack question retrieves explicit project evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'project',
        'royalty-flush',
        'Royalty Flush',
        'Royalty Flush stack: .NET Core, Entity Framework, Docker, React, PostgreSQL.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you know .NET?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use .NET?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: '.NET' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'royalty-flush');
});

test('compound technology questions split or subjects before retrieval', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'project',
        'sky-tracks',
        'Sky Tracks',
        'ARG migrated the frontend to Angular and implemented the redesigned product interface.'
      ),
      matchRow(
        'project',
        'royalty-flush',
        'Royalty Flush',
        'Royalty Flush stack: .NET Core, Entity Framework, Docker, React, PostgreSQL.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Do you know Angular or .NET?',
    config: { ...config, matchCount: 2 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Angular or .NET?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Angular or .NET' },
    }),
    embeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
    fallbackEmbeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
  });

  assert.deepEqual(
    result.contexts.map(context => context.sourceKey),
    ['sky-tracks', 'royalty-flush']
  );
});

test('compound exact technology questions keep all requested technologies and search lexically first', async () => {
  const embeddingBatches: string[][] = [];
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        'ARG can support Kubernetes-based deployments when the project infrastructure calls for it.'
      ),
      matchRow(
        'project',
        'sky-tracks',
        'Sky Tracks',
        'Sky Tracks migrated the frontend to Angular.'
      ),
      matchRow(
        'project',
        'royalty-flush',
        'Royalty Flush',
        'Royalty Flush stack: .NET Core, Docker, React, PostgreSQL.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'And .net? or angular? or react? also do you use kubernettes or docker?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider(
      'Does ARG Software use .net, angular, react, kubernettes or docker?',
      {
        plan: {
          mode: 'direct_evidence',
          entity: 'ARG Software',
          subject: '.net, angular, react, kubernettes or docker',
        },
      }
    ),
    embeddingProvider: createEmbeddingProvider(texts => {
      embeddingBatches.push(texts);
      return texts.map(() => [0.1, 0.2]);
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
  });

  assert.deepEqual(new Set(result.contexts.map(context => context.sourceKey)), new Set([
    'assistant-policy',
    'sky-tracks',
    'royalty-flush',
  ]));
  assert.deepEqual(embeddingBatches, []);
  assert.equal(supabase.calls.matchChunks.length, 0);
  assert.equal(supabase.calls.findChunksByText.length, 5);
});

test('blog-only technology evidence supports knowledge without official project evidence', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        "ARG's go-to production languages are TypeScript, JavaScript, and C#."
      ),
      matchRow(
        'blog_post',
        'svelte-runes-guide',
        'Svelte Runes Guide',
        'Blog post\nTitle: Svelte Runes Guide\nSvelte runes change how component reactivity is modeled.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Do you know Svelte?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Svelte?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Svelte' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceType, 'blog_post');
  assert.equal(result.contexts[0]?.sourceKey, 'svelte-runes-guide');
  assert.equal(result.answer, 'Grounded answer.');
});

test('testing questions are treated as quality practice rather than stack technology', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'faq',
        'faq',
        'Frequently Asked Questions',
        'Quality starts before implementation. We make architecture boundaries, testing strategy, code reviews, CI/CD, observability, recovery paths, security, and data constraints explicit.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Do you guys use testing in software?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use testing in software?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'testing in software' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceType, 'faq');
  assert.equal(result.answer, 'Grounded answer.');
});

test('QA questions are treated as delivery practice rather than stack technology', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'project',
        'mojaloop',
        'Mojaloop',
        'Supported testing, QA, and migration work so the new version could move toward production-grade adoption.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you do QA?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software do QA?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'QA' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'mojaloop');
});

test('unit testing questions are treated as quality practice rather than stack technology', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'about',
        'about',
        'About ARG Software',
        'Rui implemented frontend designs, created APIs, and added unit, integration, and end-to-end test coverage.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you use unit testing?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use unit testing?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'unit testing' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceType, 'about');
});

test('testing tool questions retrieve approved testing tool examples', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        'ARG commonly uses testing tools such as Jest, Cypress, Playwright, Testcontainers, xUnit, and NUnit.'
      ),
      matchRow(
        'faq',
        'faq',
        'Frequently Asked Questions',
        'Testing tools vary by stack, but common choices include Jest, Cypress, Playwright, Testcontainers, xUnit, and NUnit.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'What tools do you usually use for testing?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What testing tools does ARG Software usually use?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'testing tools' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'assistant-policy');
  assert.match(result.contexts[0]?.content ?? '', /Jest, Cypress, Playwright/u);
  assert.equal(result.answer, 'Grounded answer.');
});

test('Cypress and Playwright are supported testing tool questions', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        'ARG commonly uses testing tools such as Jest, Cypress, Playwright, Testcontainers, xUnit, and NUnit.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Do you use Cypress or Playwright?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Cypress or Playwright?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Cypress or Playwright' },
    }),
    embeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
    fallbackEmbeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'assistant-policy');
  assert.match(result.contexts[0]?.content ?? '', /Cypress, Playwright/u);
});

test('.NET testing tools split into xUnit and NUnit evidence checks', async () => {
  let answerQuestion = '';
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'working_with_us',
        'assistant-policy',
        'Assistant Response Policy',
        'ARG commonly uses testing tools such as Jest, Cypress, Playwright, Testcontainers, xUnit, and NUnit.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Do you use xUnit or NUnit?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use xUnit or NUnit?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'xUnit or NUnit' },
      onGenerateAnswer(question) {
        answerQuestion = question;
      },
    }),
    embeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
    fallbackEmbeddingProvider: createEmbeddingProvider(texts => texts.map(() => [0.1, 0.2])),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'assistant-policy');
  assert.match(answerQuestion, /Does ARG Software use xUnit\? \(context retrieved\)/u);
  assert.match(answerQuestion, /Does ARG Software use NUnit\? \(context retrieved\)/u);
});

test('testing practice questions without context do not use technology-stack fallback', async () => {
  const result = await askQuestion({
    question: 'Do you guys use testing in software?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('Does ARG Software use testing in software?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'testing in software' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.answer, 'Please send us a message so we can help.');
  assert.doesNotMatch(result.answer, /Testing is not part of our usual or preferred stack/u);
});

test('test tools like Jest remain technology questions', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'project',
        'sky-tracks',
        'Sky Tracks',
        'SkyTracks stack: Knex, Tone.js, Tailwind, Koa, Angular, Docker, Jest, Node.'
      ),
    ],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you use Jest?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does ARG Software use Jest?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'Jest' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceKey, 'sky-tracks');
});

test('a Rui Python follow-up directly retrieves Rui profile without article recommendations', async () => {
  const rui = source('rui-id', 'Rui Rocha', null, 'about', 'rui-rocha', { person_key: 'rui' });
  const workingWithUs = source(
    'working-with-us-id',
    'Working With Us',
    null,
    'working_with_us',
    'working-with-us'
  );
  const supabase = createSupabase({
    sources: [rui, workingWithUs],
    chunks: [
      chunk('rui-id', 'rui-rocha', 'Rui Rocha\nWorks with Python.'),
      chunk('working-with-us-id', 'working-with-us', 'Python is a language ARG uses daily.'),
    ],
    rpcRows: [
      matchRow('about', 'rui-rocha', 'Rui Rocha', 'Rui Rocha\nWorks with Python.'),
      matchRow(
        'working_with_us',
        'working-with-us',
        'Working With Us',
        'Python is a language ARG uses daily.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Does he know Python?',
    messages: [
      { role: 'user', content: 'Tell me about Rui Rocha.' },
      { role: 'assistant', content: 'Rui is an ARG co-founder.' },
    ],
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Rui Rocha know Python?', {
      plan: { mode: 'direct_evidence', entity: 'Rui Rocha', subject: 'Python' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'rui-rocha');
  assert.ok(result.contexts.some(context => context.sourceKey === 'working-with-us'));
  assert.deepEqual(result.articleRecommendations, []);
});

test('a first-name C# question retrieves José evidence without a technology allowlist', async () => {
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', { person_key: 'jose' });
  const joseCv = source('jose-cv-id', 'José Antunes', null, 'local_document', 'jose-antunes-cv', {
    person_key: 'jose',
  });
  const supabase = createSupabase({
    sources: [jose, joseCv],
    chunks: [
      chunk('jose-id', 'jose-antunes', 'José Antunes\nBackend and architecture with C#.'),
      chunk('jose-cv-id', 'jose-antunes-cv', 'Backend: C#; WebApi; .NET Core.'),
    ],
    rpcRows: [
      matchRow('about', 'jose-antunes', 'José Antunes', 'José Antunes\nBackend and architecture with C#.'),
      matchRow('local_document', 'jose-antunes-cv', 'José Antunes', 'Backend: C#; WebApi; .NET Core.'),
    ],
  });

  const result = await askQuestion({
    question: 'Does Jose know C#?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Jose know C#?', {
      plan: { mode: 'direct_evidence', entity: 'Jose', subject: 'C#' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes'));
  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes-cv'));
  assert.deepEqual(result.articleRecommendations, []);
});

test('a broad José background and ARG origin question retrieves person, about, and CV evidence', async () => {
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', { person_key: 'jose' });
  const about = source('about-id', 'About ARG Software', null, 'about', 'about');
  const joseCv = source('jose-cv-id', 'José Antunes', null, 'local_document', 'jose-antunes-cv', {
    person_key: 'jose',
  });
  const ruiCv = source('rui-cv-id', 'Rui Rocha', null, 'local_document', 'rui-rocha-cv', {
    person_key: 'rui',
  });
  const supabase = createSupabase({
    sources: [jose, about, joseCv, ruiCv],
    chunks: [
      chunk(
        'jose-id',
        'jose-antunes',
        'José Antunes\nProfessional background: Computer Science and Software Architecture from the University of Porto.'
      ),
      chunk(
        'about-id',
        'about',
        'ARG was created in 2020 to formalize a way of working that already existed between the founders.'
      ),
      chunk('jose-cv-id', 'jose-antunes-cv', 'Redacted CV evidence for José professional experience.'),
      chunk('rui-cv-id', 'rui-rocha-cv', 'Rui CV must not be used for José.'),
    ],
    rpcRows: [
      matchRow(
        'about',
        'jose-antunes',
        'José Antunes',
        'José Antunes\nProfessional background: Computer Science and Software Architecture from the University of Porto.'
      ),
      matchRow(
        'about',
        'about',
        'About ARG Software',
        'ARG was created in 2020 to formalize a way of working that already existed between the founders.'
      ),
      matchRow(
        'local_document',
        'jose-antunes-cv',
        'José Antunes',
        'Redacted CV evidence for José professional experience.'
      ),
      matchRow('local_document', 'rui-rocha-cv', 'Rui Rocha', 'Rui CV must not be used for José.'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => [[0.1, 0.2]]);

  const result = await askQuestion({
    question: 'What is Jose background, and how did Arg started?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Jose background and ARG origin', {
      plan: { mode: 'direct_evidence', entity: 'Jose', subject: 'background and how ARG started' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), [
    'jose-antunes',
    'about',
    'jose-antunes-cv',
  ]);
  assert.deepEqual(result.articleRecommendations, []);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceKeys?.includes('jose-antunes')));
});

test('compound questions retrieve separate semantic contexts with one embedding batch', async () => {
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', { person_key: 'jose' });
  const joseCv = source('jose-cv-id', 'José Antunes', null, 'local_document', 'jose-antunes-cv', {
    person_key: 'jose',
  });
  const mojaloop = source('mojaloop-id', 'Mojaloop', null, 'project', 'mojaloop');
  const supabase = createSupabase({
    sources: [jose, joseCv, mojaloop],
    chunks: [
      chunk('jose-id', 'jose-antunes', 'José Antunes\nSoftware architecture background.'),
      chunk('jose-cv-id', 'jose-antunes-cv', 'José CV professional background evidence.'),
      chunk('mojaloop-id', 'mojaloop', 'Mojaloop project work lasted multiple delivery phases.'),
    ],
    rpcRows: [
      matchRow('about', 'jose-antunes', 'José Antunes', 'José Antunes\nSoftware architecture background.'),
      matchRow(
        'local_document',
        'jose-antunes-cv',
        'José Antunes',
        'José CV professional background evidence.'
      ),
      matchRow('project', 'mojaloop', 'Mojaloop', 'Mojaloop project duration evidence.'),
    ],
  });
  const embeddingBatches: string[][] = [];

  const result = await askQuestion({
    question: 'What is Jose background? How long did you worked in mojaloop project?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('unused', {
      plan: {
        questions: [
          {
            query: 'José Antunes background',
            mode: 'direct_evidence',
            entity: 'Jose',
            subject: 'background',
          },
          {
            query: 'Mojaloop project duration',
            mode: 'direct_evidence',
            entity: 'Mojaloop',
            subject: 'project duration',
          },
        ],
      },
    }),
    embeddingProvider: createEmbeddingProvider(texts => {
      embeddingBatches.push(texts);
      return texts.map((_, index) => [index + 0.1, index + 0.2]);
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.deepEqual(embeddingBatches, [['José Antunes background', 'Mojaloop project duration']]);
  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes'));
  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes-cv'));
  assert.ok(result.contexts.some(context => context.sourceKey === 'mojaloop'));
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceKeys?.includes('mojaloop')));
});

test('compound questions preserve answered parts when another part has no context', async () => {
  let answerQuestion = '';
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', { person_key: 'jose' });
  const supabase = createSupabase({
    sources: [jose],
    chunks: [chunk('jose-id', 'jose-antunes', 'José Antunes\nSoftware architecture background.')],
    rpcRows: [
      matchRow('about', 'jose-antunes', 'José Antunes', 'José Antunes\nSoftware architecture background.'),
    ],
  });

  const result = await askQuestion({
    question: 'What is Jose background? How long did you worked in mojaloop project?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('unused', {
      plan: {
        questions: [
          {
            query: 'José Antunes background',
            mode: 'direct_evidence',
            entity: 'Jose',
            subject: 'background',
          },
          {
            query: 'Mojaloop project duration',
            mode: 'direct_evidence',
            entity: 'Mojaloop',
            subject: 'project duration',
          },
        ],
      },
      onGenerateAnswer(question) {
        answerQuestion = question;
      },
    }),
    embeddingProvider: createEmbeddingProvider(texts => texts.map((_, index) => [index + 0.1, index + 0.2])),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes'));
  assert.match(answerQuestion, /José Antunes background \(context retrieved\)/u);
  assert.match(answerQuestion, /Mojaloop project duration \(no context retrieved\)/u);
});

test('an unconfirmed person technology searches only public and personal evidence', async () => {
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', {
    person_key: 'jose',
  });
  const joseCv = source('jose-cv-id', 'José Antunes', null, 'local_document', 'jose-antunes-cv', {
    person_key: 'jose',
  });
  const supabase = createSupabase({
    sources: [jose, joseCv],
    chunks: [
      chunk('jose-id', 'jose-antunes', 'José Antunes\nBackend and architecture with C#.'),
      chunk('jose-cv-id', 'jose-antunes-cv', 'Backend: C#; WebApi; .NET Core.'),
    ],
  });

  const result = await askQuestion({
    question: 'Does Jose know Go?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Jose know Go?', {
      plan: { mode: 'direct_evidence', entity: 'Jose', subject: 'Go' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.answer, 'Please send us a message so we can help.');
  assert.deepEqual(result.contexts, []);
  assert.deepEqual(result.articleRecommendations, []);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceKeys?.includes('jose-antunes')));
});

test('a founder skill question never uses another person\'s CV as evidence', async () => {
  const rui = source('rui-id', 'Rui Rocha', null, 'about', 'rui-rocha', { person_key: 'rui' });
  const ruiCv = source('rui-cv-id', 'Rui Rocha', null, 'local_document', 'rui-rocha-cv', {
    person_key: 'rui',
  });
  const joseCv = source('jose-cv-id', 'José Antunes', null, 'local_document', 'jose-antunes-cv', {
    person_key: 'jose',
  });
  const supabase = createSupabase({
    sources: [rui, ruiCv, joseCv],
    chunks: [
      chunk('rui-id', 'rui-rocha', 'Rui Rocha\nFrontend and delivery.'),
      chunk('rui-cv-id', 'rui-rocha-cv', 'Backend: C#; .NET Core.'),
      chunk('jose-cv-id', 'jose-antunes-cv', 'Backend: Python; Mapnik.'),
    ],
  });

  const result = await askQuestion({
    question: 'Does Rui know Python?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Rui know Python?', {
      plan: { mode: 'direct_evidence', entity: 'Rui', subject: 'Python' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.every(context => context.sourceKey !== 'jose-antunes-cv'));
  assert.deepEqual(result.articleRecommendations, []);
});

test('team questions retrieve the public team source without embeddings', async () => {
  const team = source('team-id', 'ARG Team', null, 'about', 'arg-team');
  const supabase = createSupabase({
    sources: [team],
    chunks: [chunk('team-id', 'arg-team', 'José Antunes and Rui Rocha are ARG co-founders.')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for team questions');
  });

  const result = await askQuestion({
    question: 'Who are the team members of ARG?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Who are the team members of ARG?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Team', subject: '' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['arg-team']);
  assert.deepEqual(supabase.calls.matchChunks, []);
});

test('an unresolved personal pronoun asks for clarification', async () => {
  const result = await askQuestion({
    question: 'Does he know Python?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('Does he know Python?'),
    embeddingProvider: createEmbeddingProvider(() => {
      throw new Error('Embeddings must not be generated for unresolved people');
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.match(result.answer, /Who do you mean/u);
  assert.deepEqual(result.actions, [{ type: 'email_hello' }]);
});

test('runtime retrieval switches to the fallback index after a primary quota error', async () => {
  const supabase = createSupabase({
    rpcRows: [matchRow('blog_post', 'fallback-post', 'Fallback post', 'Blog post')],
  });

  await retrieveRelevantChunks({
    question: 'Explain Python architecture',
    retrievalQuestion: 'Explain Python architecture',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Explain Python architecture', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'Python architecture' },
    }),
    embeddingProvider: createEmbeddingProvider(() => {
      throw new GeminiEmbeddingQuotaError('primary');
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(supabase.calls.matchChunks[0]?.index, 'fallback');
});

function createSupabase({
  sources = [],
  chunks = [],
  rpcRows = [],
}: {
  sources?: ReturnType<typeof source>[];
  chunks?: ReturnType<typeof chunk>[];
  rpcRows?: ReturnType<typeof matchRow>[];
}) {
  const repository = new FakeRagReadRepository({ sources, chunks, contexts: rpcRows });

  return { repository, calls: repository.calls };
}
