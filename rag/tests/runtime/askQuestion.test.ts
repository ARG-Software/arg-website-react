import assert from 'node:assert/strict';
import test from 'node:test';

import { EmbeddingQuotaExceededError } from '../../domain/providers/ProviderErrors.js';
import { createFakeAnswerProvider as createAnswerProvider } from '../fakes/FakeAnswerProvider.js';
import { createFakeEmbeddingProvider as createEmbeddingProvider } from '../fakes/FakeEmbeddingProvider.js';
import { FakeRagReadRepository } from '../fakes/FakeRagReadRepository.js';
import { createContextFixture as matchRow } from '../fixtures/contexts.js';
import { createTestConfig } from '../fixtures/config.js';
import { createChunkFixture as chunk, createSourceFixture as source } from '../fixtures/sources.js';
import { loadLocalSources } from '../../ingestion/sources/local.js';
import { buildInsufficientContextPrompt } from '../../prompts/insufficientContext.js';
import { askQuestion, retrieveRelevantChunks, resolveRetrievalRoute } from '../../runtime/ask/askQuestion.js';
import { createAssistantActions } from '../../runtime/ask/response/actions.js';
import { createCitations } from '../../runtime/ask/response/citations.js';

const config = createTestConfig({ matchCount: 1 });

const APPROVED_PROJECT_COMMERCIAL_FACTS = [
  {
    projectName: 'Sky Tracks',
    sourceKey: 'sky-tracks',
    budget: '$20K - $100K',
    duration: '12 Months',
    year: '2022',
    engagementTimeline: '1 Year',
  },
  {
    projectName: 'Mojaloop',
    sourceKey: 'mojaloop',
    budget: '$100K - $250K',
    duration: '24 Months',
    year: '2024',
    engagementTimeline: 'Ongoing',
  },
  {
    projectName: 'Vector',
    sourceKey: 'vector',
    budget: '$20K - $100K',
    duration: '13 Months',
    year: '2024',
    engagementTimeline: '6 Months',
  },
  {
    projectName: 'Dokutar',
    sourceKey: 'dokutar',
    budget: '$20K - $100K',
    duration: '24 Months',
    year: '2022',
    engagementTimeline: '2 Years',
  },
  {
    projectName: 'TV Cine',
    sourceKey: 'tv-cine',
    budget: '$5K - $20K',
    duration: '3 Months',
    year: '2022',
    engagementTimeline: '1 Year',
  },
  {
    projectName: "People's Clearinghouse",
    sourceKey: 'peoples-clearinghouse',
    budget: '$20K - $100K',
    duration: '12 Months',
    year: '2026',
    engagementTimeline: '3 Years',
  },
];

const APPROVED_COMMERCIAL_DATA_CONTENT = [
  'Approved commercial data for ARG Software.',
  'Published project budget ranges and project durations:',
  ...APPROVED_PROJECT_COMMERCIAL_FACTS.map(
    fact => `${fact.projectName}: budget ${fact.budget}; duration ${fact.duration}; year ${fact.year}.`
  ),
  'Use a project budget range or project duration only for the named project. Do not present ARG engagement duration as project build duration.',
].join('\n');

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

test('an article-discovery plan uses the blog latest route', () => {
  const route = resolveRetrievalRoute('What are the most recent blog posts?', {
    mode: 'article_discovery',
    entity: '',
    subject: 'blog posts',
  });

  assert.equal(route.kind, 'blog');
  assert.equal(route.blogKind, 'latest');
});

test('article-discovery routes non-latest article questions as blog topic discovery', () => {
  const route = resolveRetrievalRoute('Do you have articles about architecture?', {
    mode: 'article_discovery',
    entity: '',
    subject: 'architecture articles',
  });

  assert.equal(route.kind, 'blog');
  assert.equal(route.blogKind, 'topic_discovery');
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
    'blog'
  );
  assert.ok(result.answer.length > 0);
});

test('commercial route precedence separates pricing, MVP timelines, project duration, and engagement duration', () => {
  const plan = { mode: 'direct_evidence' as const, entity: 'ARG Software', subject: '' };

  const pricingRoute = resolveRetrievalRoute('How much does a project cost?', {
    ...plan,
    subject: 'project pricing',
  });
  const mvpRoute = resolveRetrievalRoute('How long does it take to build an MVP?', {
    ...plan,
    subject: 'MVP delivery estimate',
  });
  const projectDurationRoute = resolveRetrievalRoute('How long did Vector take?', {
    ...plan,
    subject: 'project duration',
  });
  const engagementRoute = resolveRetrievalRoute('How long did ARG work with Vector?', {
    ...plan,
    subject: 'engagement duration',
  });

  assert.equal(pricingRoute.kind, 'commercial_delivery');
  assert.equal(pricingRoute.commercialKind, 'general_pricing');
  assert.equal(mvpRoute.kind, 'commercial_delivery');
  assert.equal(mvpRoute.commercialKind, 'timeline_estimate');
  assert.equal(projectDurationRoute.kind, 'commercial_delivery');
  assert.equal(projectDurationRoute.commercialKind, 'project_duration');
  assert.equal(projectDurationRoute.entity, 'Vector');
  assert.equal(engagementRoute.kind, 'commercial_delivery');
  assert.equal(engagementRoute.commercialKind, 'engagement_duration');
  assert.equal(engagementRoute.entity, 'Vector');
});

test('link-action routing retrieves links but does not hijack pricing requests', () => {
  const plan = { mode: 'direct_evidence' as const, entity: 'ARG Software', subject: '' };
  const githubRoute = resolveRetrievalRoute('Can you send me your GitHub link?', {
    ...plan,
    subject: 'GitHub link',
  });
  const pricingRoute = resolveRetrievalRoute('Can you send me a pricing quote?', {
    ...plan,
    subject: 'pricing quote',
  });

  assert.equal(githubRoute.kind, 'link_action');
  assert.equal(pricingRoute.kind, 'commercial_delivery');
  assert.equal(pricingRoute.commercialKind, 'general_pricing');
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
    'company_services'
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

test('published project architecture questions retrieve the named project evidence', async () => {
  const mojaloop = source('mojaloop-id', 'Mojaloop', null, 'project', 'mojaloop');
  const supabase = createSupabase({
    sources: [mojaloop],
    rpcRows: [
      matchRow(
        'project',
        'mojaloop',
        'Mojaloop',
        'Mojaloop vNext was redesigned around microservices and zero-trust service boundaries.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'O Mojaloop usa micro serviços?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Mojaloop use microservices?', {
      language: 'pt-PT',
      plan: { mode: 'direct_evidence', entity: 'Mojaloop', subject: 'microservices architecture' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'mojaloop');
  assert.match(result.contexts[0]?.content ?? '', /microservices/u);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceKeys?.includes('mojaloop')));
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
  assert.deepEqual(result.actions, [
    { type: 'book_meeting' },
    { type: 'gaspar_message' },
    { type: 'contact_form' },
  ]);
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceTypes?.includes('faq')));
});

test('external link questions retrieve the site-links source without embeddings', async () => {
  const siteLinks = source('site-links-id', 'ARG Links and Contact Options', null, 'homepage', 'site-links');
  const supabase = createSupabase({
    sources: [siteLinks],
    chunks: [chunk('site-links-id', 'site-links', 'socials github: https://github.com/ARG-Software')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for link actions');
  });

  const result = await askQuestion({
    question: 'What is your GitHub link?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('GitHub link', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'GitHub link' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'site-links');
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('site-links RAG source exposes Gaspar messaging and one general email', async () => {
  const sources = await loadLocalSources(process.cwd(), {
    all: false,
    force: false,
    fallbackOnly: false,
    sourceKeys: ['site-links'],
    filePaths: [],
    urls: [],
  });
  const siteLinks = sources.find(item => item.sourceKey === 'site-links');

  assert.ok(siteLinks);
  assert.match(siteLinks.content, /send a message through Gaspar/u);
  assert.match(siteLinks.content, /hello@arg\.software/u);
  assert.doesNotMatch(siteLinks.content, /info@arg\.software/u);
});

test('direct message-through-Gaspar questions request lead capture auto-start', () => {
  const questions = [
    'Can I send a message through you?',
    'Can I send a message through Gaspar?',
    'I want to send you a message',
    'Can you pass a message to the ARG team?',
    'Can I do it through you?',
  ];

  for (const question of questions) {
    assert.deepEqual(createAssistantActions(question), [
      { type: 'gaspar_message', autoStart: true },
    ]);
  }
});

test('message wording false positives do not auto-start lead capture', () => {
  const falsePositiveQuestions = [
    'Can you send me information about ARG?',
    'Can you send me your portfolio?',
    'Can you send me your GitHub link?',
    'Can I message Rui directly?',
    'Send a message explaining CQRS',
    'Can you forward this article to me?',
    "What's the message of ARG as a company?",
  ];

  for (const question of falsePositiveQuestions) {
    assert.ok(
      !createAssistantActions(question).some(
        action => action.type === 'gaspar_message' && action.autoStart
      ),
      `${question} should not auto-start lead capture`
    );
  }
});

test('HR message request keeps careers action instead of Gaspar lead capture', () => {
  assert.deepEqual(createAssistantActions('Can I send a message to HR?'), [{ type: 'email_hr' }]);
});

test('contact questions put Gaspar messaging before alternatives', async () => {
  const embeddingProvider = createEmbeddingProvider(() => [[0.1, 0.2]]);

  const result = await askQuestion({
    question: 'How can I contact you?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('ARG contact options', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'contact options' },
      insufficientContextAnswer:
        'You can send a message through me here. You can also book a meeting, open the contact form, or email hello@arg.software.',
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.actions, [
    { type: 'gaspar_message' },
    { type: 'book_meeting' },
    { type: 'contact_form' },
  ]);
  assert.match(result.answer, /message through me here/u);
  assert.match(result.answer, /hello@arg\.software/u);
  assert.doesNotMatch(result.answer, /info@arg\.software/u);
});

test('direct Gaspar message requests auto-start through the runtime response', async () => {
  const embeddingProvider = createEmbeddingProvider(() => [[0.1, 0.2]]);

  const result = await askQuestion({
    question: 'Can I send a message through you?',
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('ARG contact options', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'contact options' },
      insufficientContextAnswer:
        'Yes, you can send a message through me here. I will ask for your reply email and message.',
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.actions, [{ type: 'gaspar_message', autoStart: true }]);
});

test('conversation transform rewrites the previous assistant answer without retrieval', async () => {
  const supabase = createSupabase({});
  let rewriteRequest: unknown = null;
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for conversation transforms');
  });

  const result = await askQuestion({
    question: 'make it brief',
    messages: [
      { role: 'user', content: 'I want to know more about ARG' },
      { role: 'assistant', content: 'ARG Software is a senior-led software studio. Long answer.' },
    ],
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Unused retrieval query', {
      intent: 'conversation_transform',
      transformTask: 'shorten_previous_answer',
      rewrittenAnswer: 'ARG Software is a senior-led software studio.',
      onRewritePreviousAnswer(instruction, previousAnswer, task) {
        rewriteRequest = { instruction, previousAnswer, task };
      },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.answer, 'we are a senior-led software studio.');
  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.actions, []);
  assert.deepEqual(rewriteRequest, {
    instruction: 'make it brief',
    previousAnswer: 'ARG Software is a senior-led software studio. Long answer.',
    task: 'shorten_previous_answer',
  });
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('conversation transform without a previous answer asks for clarification', async () => {
  const result = await askQuestion({
    question: "I didn't understand",
    config,
    readRepository: createSupabase({}).repository,
    answerProvider: createAnswerProvider('Unused retrieval query', {
      intent: 'conversation_transform',
      transformTask: 'simplify_previous_answer',
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.match(result.answer, /what you want clarified/u);
  assert.deepEqual(result.contexts, []);
});

test('website build service enquiries retrieve ARG service evidence rather than link actions', async () => {
  const services = source('home-services-id', 'ARG Services', null, 'homepage', 'home:services');
  const supabase = createSupabase({
    sources: [services],
    rpcRows: [
      matchRow(
        'homepage',
        'home:services',
        'ARG Services',
        'ARG services include software engineering, frontend, backend, architecture, and product delivery.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Preciso de ajuda a fazer um site. Podes ajudar me?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Can ARG Software help build a website?', {
      language: 'pt-PT',
      plan: { mode: 'editorial', entity: 'ARG Software', subject: 'website development' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'home:services');
  assert.ok(supabase.calls.matchChunks.some(call => call.sourceTypes?.includes('homepage')));
});

test('general pricing questions retrieve FAQ pricing context without policy facts', async () => {
  const faq = source('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq');
  const supabase = createSupabase({
    sources: [faq],
    chunks: [
      chunk(
        'faq-id',
        'faq',
        'Project budgets usually start around EUR 10,000, but final estimates depend on the application and are reviewed case by case.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for general pricing');
  });

  const result = await askQuestion({
    question: 'How much does a project cost?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Pricing answer', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'project pricing' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'faq');
  assert.match(result.contexts[0]?.content ?? '', /EUR 10,000/u);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('general MVP timeline questions retrieve FAQ timeline context', async () => {
  const faq = source('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq');
  const supabase = createSupabase({
    sources: [faq],
    chunks: [chunk('faq-id', 'faq', 'Most focused MVPs take 8 to 14 weeks, depending on complexity.')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for timeline estimates');
  });

  const result = await askQuestion({
    question: 'How long does it take to build an MVP?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Timeline answer', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'MVP delivery estimate' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'faq');
  assert.match(result.contexts[0]?.content ?? '', /8 to 14 weeks/u);
  assert.deepEqual(supabase.calls.findChunksByText[0]?.terms, ['Most focused MVPs', '8 to 14 weeks']);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('named project budgets and durations retrieve approved commercial facts only', async () => {
  const designRush = {
    ...source('designrush-id', 'Approved Commercial Data', null, 'external_page', 'designrush'),
    origin: 'trusted_external' as const,
    url: 'https://www.designrush.com/agency/profile/arg-software',
  };
  const projectSources = APPROVED_PROJECT_COMMERCIAL_FACTS.map(fact =>
    source(`${fact.sourceKey}-id`, fact.projectName, null, 'project', fact.sourceKey)
  );
  const supabase = createSupabase({
    sources: [designRush, ...projectSources],
    chunks: [
      chunk('designrush-id', 'designrush', APPROVED_COMMERCIAL_DATA_CONTENT),
      ...APPROVED_PROJECT_COMMERCIAL_FACTS.map(fact =>
        chunk(
          `${fact.sourceKey}-id`,
          fact.sourceKey,
          `project ${fact.projectName} timeline: ${fact.engagementTimeline}`
        )
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for commercial facts');
  });

  for (const fact of APPROVED_PROJECT_COMMERCIAL_FACTS) {
    const budgetResult = await askQuestion({
      question: `What was the ${fact.projectName} budget?`,
      config,
      readRepository: supabase.repository,
      answerProvider: createAnswerProvider(`${fact.projectName} budget`, {
        plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'project budget' },
      }),
      embeddingProvider,
      fallbackEmbeddingProvider: embeddingProvider,
    });
    const durationResult = await askQuestion({
      question: `How long did ${fact.projectName} take?`,
      config,
      readRepository: supabase.repository,
      answerProvider: createAnswerProvider(`${fact.projectName} duration`, {
        plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'project duration' },
      }),
      embeddingProvider,
      fallbackEmbeddingProvider: embeddingProvider,
    });

    assert.equal(budgetResult.contexts[0]?.sourceKey, 'designrush');
    assert.ok(budgetResult.contexts[0]?.content.includes(`${fact.projectName}: budget ${fact.budget}`));
    assert.equal(durationResult.contexts[0]?.sourceKey, 'designrush');
    assert.ok(durationResult.contexts[0]?.content.includes(`duration ${fact.duration}`));
    assert.doesNotMatch(
      durationResult.contexts[0]?.content ?? '',
      new RegExp(`project ${fact.projectName} timeline: ${fact.engagementTimeline}`, 'u')
    );
  }

  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('project duration questions do not fall back to engagement timeline when commercial facts are missing', async () => {
  const designRush = {
    ...source('designrush-id', 'Approved Commercial Data', null, 'external_page', 'designrush'),
    origin: 'trusted_external' as const,
    url: 'https://www.designrush.com/agency/profile/arg-software',
  };
  const royaltyFlush = source(
    'royalty-flush-id',
    'Royalty Flush',
    null,
    'project',
    'royalty-flush'
  );
  const supabase = createSupabase({
    sources: [designRush, royaltyFlush],
    chunks: [
      chunk('designrush-id', 'designrush', APPROVED_COMMERCIAL_DATA_CONTENT),
      chunk('royalty-flush-id', 'royalty-flush', 'project Royalty Flush timeline: 1 Year'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for commercial facts');
  });

  const result = await askQuestion({
    question: 'How long did Royalty Flush take?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Royalty Flush duration', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'project duration' },
      insufficientContextAnswer: 'No approved project duration is available.',
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts.length, 0);
  assert.equal(result.answer, 'No approved project duration is available.');
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('engagement duration questions retrieve official project engagement context', async () => {
  const vector = source('vector-id', 'Vector', null, 'project', 'vector');
  const supabase = createSupabase({
    sources: [vector],
    chunks: [chunk('vector-id', 'vector', 'project Vector timeline: 6 Months')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for engagement duration');
  });

  const result = await askQuestion({
    question: 'How long did ARG work with Vector?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Vector engagement', {
      plan: { mode: 'direct_evidence', entity: 'Vector', subject: 'engagement duration' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'vector');
  assert.match(result.contexts[0]?.content ?? '', /6 Months/u);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('project page context resolves this-project duration questions', async () => {
  let answerQuestion = '';
  const designRush = {
    ...source('designrush-id', 'Approved Commercial Data', null, 'external_page', 'designrush'),
    origin: 'trusted_external' as const,
  };
  const supabase = createSupabase({
    sources: [designRush, source('vector-id', 'Vector', null, 'project', 'vector')],
    chunks: [
      chunk('designrush-id', 'designrush', APPROVED_COMMERCIAL_DATA_CONTENT),
      chunk('vector-id', 'vector', 'project Vector timeline: 6 Months'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for contextual project duration');
  });

  const result = await askQuestion({
    question: 'How much time did it took to do this project?',
    pageContext: { pathname: '/projects/vector/', title: 'Vector - Use Case | Arg Software' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('How much time did it took to do this project?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'project duration' },
      onGenerateAnswer(question) {
        answerQuestion = question;
      },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'designrush');
  assert.match(result.contexts[0]?.content ?? '', /Vector: budget \$20K - \$100K; duration 13 Months/u);
  assert.match(answerQuestion, /Resolved current-page reference: Vector project duration/u);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('project page context resolves translated current-project questions', async () => {
  let classifiedPageContext: unknown = null;
  let answerQuestion = '';
  const mojaloop = source('mojaloop-id', 'Mojaloop', null, 'project', 'mojaloop');
  const supabase = createSupabase({
    sources: [mojaloop],
    rpcRows: [
      matchRow(
        'project',
        'mojaloop',
        'Mojaloop',
        'Mojaloop is an open-source payment switch rebuilt around bank-ready payment infrastructure.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Podes falar me mais sobre este projeto?',
    pageContext: { pathname: '/projects/mojaloop/', title: 'Mojaloop - Use Case | Arg Software' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Tell me more about this project', {
      language: 'pt-PT',
      plan: { mode: 'direct_evidence', entity: '', subject: 'project overview' },
      onClassifyIntent(_question, pageContext) {
        classifiedPageContext = pageContext;
      },
      onGenerateAnswer(question) {
        answerQuestion = question;
      },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'mojaloop');
  assert.match(answerQuestion, /Resolved current-page reference: Mojaloop project overview/u);
  assert.deepEqual(classifiedPageContext, {
    pathname: '/projects/mojaloop/',
    title: 'Mojaloop - Use Case | Arg Software',
    pageKind: 'project',
    projectSlug: 'mojaloop',
    projectName: 'Mojaloop',
    sourceKeys: ['mojaloop'],
  });
});

test('project page context does not hijack general timeline questions', async () => {
  const faq = source('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq');
  const supabase = createSupabase({
    sources: [faq],
    chunks: [chunk('faq-id', 'faq', 'Most focused MVPs take 8 to 14 weeks, depending on complexity.')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for general MVP timelines');
  });

  const result = await askQuestion({
    question: 'How much does an MVP usually take?',
    pageContext: { pathname: '/projects/vector/', title: 'Vector - Use Case | Arg Software' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('MVP delivery estimate', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'MVP delivery estimate' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.equal(result.contexts[0]?.sourceKey, 'faq');
  assert.match(result.contexts[0]?.content ?? '', /8 to 14 weeks/u);
});

test('homepage active-section context retrieves the visible section source', async () => {
  const services = source('home-services-id', 'ARG Services', null, 'homepage', 'home:services');
  const cases = source('home-projects-id', 'Homepage Projects', null, 'homepage', 'home:projects');
  const supabase = createSupabase({
    sources: [services, cases],
    chunks: [
      chunk('home-services-id', 'home-services', 'ARG Services section: engineering, architecture, cloud, AI, and product delivery.'),
      chunk('home-projects-id', 'home-projects', 'Homepage Projects section: fintech, media, and trading platform work.'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for contextual homepage sections');
  });

  const servicesResult = await askQuestion({
    question: 'Tell me more about this section',
    pageContext: { pathname: '/', title: 'ARG Software', activeSection: 'services' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Tell me more about this section', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'section' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });
  const casesResult = await askQuestion({
    question: 'What kind of work is shown here?',
    pageContext: { pathname: '/', title: 'ARG Software', activeSection: 'cases' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What kind of work is shown here?', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'work examples' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(servicesResult.contexts.map(context => context.sourceKey), ['home:services']);
  assert.deepEqual(casesResult.contexts.map(context => context.sourceKey), ['home:projects']);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('homepage faq section context retrieves faq sources for this-section budget questions', async () => {
  const homeFaq = source('home-faq-id', 'Homepage FAQ', null, 'homepage', 'home:faq');
  const faq = source('faq-id', 'Frequently Asked Questions', null, 'faq', 'faq');
  const supabase = createSupabase({
    sources: [homeFaq, faq],
    chunks: [
      chunk('home-faq-id', 'home-faq', 'Homepage FAQ section: budget, timeline, and collaboration questions.'),
      chunk('faq-id', 'faq', 'Project budgets usually start around EUR 10,000 and are reviewed case by case.'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for contextual FAQ section');
  });

  const result = await askQuestion({
    question: 'What does this section say about budget?',
    pageContext: { pathname: '/', title: 'ARG Software', activeSection: 'faq' },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What does this section say about budget?', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'budget' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['home:faq', 'faq']);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('static page context retrieves page-specific sources', async () => {
  const sources = [
    source('working-id', 'Working With Us', null, 'working_with_us', 'working-with-us'),
    source('careers-id', 'Careers Page', null, 'careers', 'careers-page'),
    source('jobs-id', 'Jobs and Hiring Traits', null, 'careers', 'jobs'),
    source('about-id', 'About ARG Software', null, 'about', 'about'),
    source('team-id', 'ARG Team', null, 'about', 'arg-team'),
    source('links-id', 'ARG Links and Contact Options', null, 'homepage', 'site-links'),
    source('partners-id', 'Partners Page', null, 'partner', 'partners-page'),
  ];
  const supabase = createSupabase({
    sources,
    chunks: [
      chunk('working-id', 'working', 'Working With Us page: fit, collaboration model, and delivery process.'),
      chunk('careers-id', 'careers', 'Careers page: hiring information and candidate traits.'),
      chunk('jobs-id', 'jobs', 'Jobs and Hiring Traits: open roles and application details.'),
      chunk('about-id', 'about', 'About ARG Software: origin story and studio background.'),
      chunk('team-id', 'team', 'ARG Team: José Antunes and Rui Rocha.'),
      chunk('links-id', 'links', 'ARG Links and Contact Options: hello email, meeting, and project brief.'),
      chunk('partners-id', 'partners', 'Partners Page: client and partner relationships.'),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for contextual static pages');
  });

  const cases = [
    {
      path: '/working-with-us/',
      title: 'Working With Us',
      question: 'What does this page say about working together?',
      expected: ['working-with-us'],
    },
    {
      path: '/careers/',
      title: 'Careers',
      question: 'What roles or hiring info are on this page?',
      expected: ['careers-page', 'jobs'],
    },
    {
      path: '/about-us/',
      title: 'About Us',
      question: 'Who are the people behind this page?',
      expected: ['about', 'arg-team'],
    },
    {
      path: '/contact/',
      title: 'Contact',
      question: 'How can I use this page to contact you?',
      expected: ['site-links'],
    },
    {
      path: '/partners/',
      title: 'Partners',
      question: 'What is shown on this page?',
      expected: ['partners-page'],
    },
  ];

  for (const item of cases) {
    const result = await askQuestion({
      question: item.question,
      pageContext: { pathname: item.path, title: item.title },
      config,
      readRepository: supabase.repository,
      answerProvider: createAnswerProvider(item.question, {
        plan: { mode: 'direct_evidence', entity: '', subject: 'page content' },
      }),
      embeddingProvider,
      fallbackEmbeddingProvider: embeddingProvider,
    });

    assert.deepEqual(result.contexts.map(context => context.sourceKey), item.expected);
  }

  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('blog page context retrieves the current article source', async () => {
  const article = source(
    'article-id',
    'The Stack Nobody Hypes, but Serious CTOs Keep Choosing',
    'July 1, 2026',
    'blog_post',
    'the-stack-nobody-hypes'
  );
  const supabase = createSupabase({
    sources: [article],
    chunks: [chunk('article-id', 'article', 'Article content: a practical stack for serious CTOs.')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for contextual blog article');
  });

  const result = await askQuestion({
    question: 'What is this article about?',
    pageContext: {
      pathname: '/blog/the-stack-nobody-hypes/',
      title: 'The Stack Nobody Hypes, but Serious CTOs Keep Choosing',
    },
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('What is this article about?', {
      plan: { mode: 'editorial', entity: '', subject: 'article summary' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['the-stack-nobody-hypes']);
  assert.equal(supabase.calls.matchChunks.length, 0);
});

test('open-source questions search only the portfolio PDF source', async () => {
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'local_document',
        'portfolio-pdf',
        'ARG Software Portfolio',
        "People's Clearinghouse is a client project that extends Mojaloop vNext."
      ),
      matchRow(
        'local_document',
        'portfolio-pdf',
        'ARG Software Portfolio',
        'Our Open Source Projects\nNx-Monorepo-Boilerplate\nBrowser Extension Boilerplate\nClean-Architecture'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Does ARG have open source projects?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Open source answer', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'open source projects' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.contexts[0]?.sourceKey, 'portfolio-pdf');
  assert.match(result.contexts[0]?.content ?? '', /Our Open Source Projects/u);
  assert.doesNotMatch(result.contexts[0]?.content ?? '', /People's Clearinghouse/u);
  assert.deepEqual(supabase.calls.matchChunks[0]?.sourceKeys, ['portfolio-pdf']);
  assert.equal(supabase.calls.matchChunks[0]?.sourceTypes, null);
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

test('company-level CQRS questions retrieve team and blog evidence without individual attribution', async () => {
  const joseContext = {
    ...matchRow(
      'about',
      'jose-antunes',
      'José Antunes',
      'José Antunes has a professional background with CQRS.'
    ),
    sourceMetadata: { person_key: 'jose', evidence_scope: 'individual_public' },
  };
  const supabase = createSupabase({
    rpcRows: [
      matchRow(
        'about',
        'about',
        'About ARG Software',
        'José worked on architecture-heavy platforms with DDD/CQRS.'
      ),
      joseContext,
      matchRow(
        'about',
        'arg-team-capabilities',
        'ARG Team Capabilities',
        'ARG team-level capability evidence includes architecture-first delivery, DDD, CQRS, and backend design.'
      ),
      matchRow(
        'blog_post',
        'cqrs-without-mediatr',
        'CQRS without MediatR in .NET',
        'Blog post\nTitle: CQRS without MediatR in .NET\nThe article discusses CQRS implementation trade-offs.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Have you worked with CQRS?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Have ARG Software worked with CQRS?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Software', subject: 'CQRS' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.some(context => context.sourceKey === 'arg-team-capabilities'));
  assert.ok(result.contexts.some(context => context.sourceKey === 'cqrs-without-mediatr'));
  assert.ok(result.contexts.every(context => context.sourceKey !== 'jose-antunes'));
  assert.ok(result.contexts.every(context => context.sourceKey !== 'about'));
  assert.deepEqual(result.articleRecommendations.map(article => article.title), [
    'CQRS without MediatR in .NET',
  ]);
});

test('named-person CQRS questions can retrieve that person evidence', async () => {
  const jose = source('jose-id', 'José Antunes', null, 'about', 'jose-antunes', {
    person_key: 'jose',
  });
  const supabase = createSupabase({
    sources: [jose],
    rpcRows: [
      {
        ...matchRow(
          'about',
          'jose-antunes',
          'José Antunes',
          'José Antunes has architecture and CQRS experience.'
        ),
        sourceMetadata: { person_key: 'jose', evidence_scope: 'individual_public' },
      },
      matchRow(
        'blog_post',
        'cqrs-without-mediatr',
        'CQRS without MediatR in .NET',
        'Blog post\nTitle: CQRS without MediatR in .NET\nCQRS implementation trade-offs.'
      ),
    ],
  });

  const result = await askQuestion({
    question: 'Does Jose know CQRS?',
    config: { ...config, matchCount: 6 },
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Jose know CQRS?', {
      plan: { mode: 'direct_evidence', entity: 'Jose', subject: 'CQRS' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.ok(result.contexts.some(context => context.sourceKey === 'jose-antunes'));
  assert.ok(result.contexts.every(context => context.sourceKey !== 'cqrs-without-mediatr'));
  assert.deepEqual(result.articleRecommendations, []);
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
      matchRow('project', 'mojaloop', 'Mojaloop', 'Mojaloop project work evidence.'),
    ],
  });
  const embeddingBatches: string[][] = [];

  const result = await askQuestion({
    question: 'What is Jose background? What did you work on in the Mojaloop project?',
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
            query: 'Mojaloop project work',
            mode: 'direct_evidence',
            entity: 'Mojaloop',
            subject: 'project work',
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

  assert.deepEqual(embeddingBatches, [['José Antunes background', 'Mojaloop project work']]);
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

test('Gaspar profile questions retrieve the assistant profile source without embeddings', async () => {
  const gaspar = source('gaspar-id', 'Gaspar', null, 'homepage', 'assistant-profile');
  const supabase = createSupabase({
    sources: [gaspar],
    chunks: [
      chunk(
        'gaspar-id',
        'assistant-profile',
        'I was born in Caniço, Madeira, in 2019. I like working at ARG and like to play, walk, enjoy the views, and eat.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for Gaspar profile questions');
  });

  const result = await askQuestion({
    question: 'Do you like working at ARG?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Does Gaspar like working at ARG?', {
      plan: { mode: 'direct_evidence', entity: 'Gaspar', subject: 'assistant profile' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['assistant-profile']);
  assert.match(result.contexts[0]?.content ?? '', /Caniço, Madeira/u);
  assert.deepEqual(supabase.calls.matchChunks, []);
});

test('Gaspar profile citations are suppressed even when the source has a homepage URL', () => {
  const citations = createCitations(
    [
      {
        ...matchRow(
          'homepage',
          'assistant-profile',
          'Gaspar',
          'My name is Gaspar. I was born in Canico, Madeira, in 2019.'
        ),
        url: 'https://arg.software/',
      },
    ],
    config.siteUrl
  );

  assert.deepEqual(citations, []);
});

test('direct AI identity questions retrieve Gaspar profile source without embeddings', async () => {
  const gaspar = source('gaspar-id', 'Gaspar', null, 'homepage', 'assistant-profile');
  const supabase = createSupabase({
    sources: [gaspar],
    chunks: [
      chunk(
        'gaspar-id',
        'assistant-profile',
        'My name is Gaspar. I was born in Caniço, Madeira, in 2019.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for direct Gaspar identity questions');
  });

  const result = await askQuestion({
    question: 'Are you an AI assistant?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Is Gaspar an AI assistant?', {
      plan: { mode: 'direct_evidence', entity: 'Gaspar', subject: 'assistant profile' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['assistant-profile']);
  assert.match(result.contexts[0]?.content ?? '', /My name is Gaspar/u);
  assert.deepEqual(supabase.calls.matchChunks, []);
});

test('human language questions route to Gaspar profile instead of technology support', () => {
  const questions = [
    'Falas russo?',
    'Que idiomas falas?',
    'Do you speak Russian?',
    'Can you answer in Dutch?',
    'Parles français?',
    'Hablas alemán?',
  ];

  for (const question of questions) {
    const route = resolveRetrievalRoute(question, {
      mode: 'direct_evidence',
      entity: '',
      subject: 'Russian',
    });

    assert.equal(route.entity, 'Gaspar');
    assert.equal(route.subject, 'assistant profile');
    assert.deepEqual(route.sourceKeys, ['assistant-profile']);
    assert.equal(route.forceFirstChunks, true);
  }
});

test('human language questions retrieve the assistant profile source without embeddings', async () => {
  const gaspar = source('gaspar-id', 'Gaspar', null, 'homepage', 'assistant-profile');
  const supabase = createSupabase({
    sources: [gaspar],
    chunks: [
      chunk(
        'gaspar-id',
        'assistant-profile',
        'I can try to answer visitors in the language they use or request. The ARG team mainly communicates in Portuguese and English.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for Gaspar language questions');
  });

  const result = await askQuestion({
    question: 'Falas francês?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Can Gaspar answer in French?', {
      language: 'pt-PT',
      plan: { mode: 'direct_evidence', entity: '', subject: '' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['assistant-profile']);
  assert.equal(result.language, 'pt-PT');
  assert.match(result.contexts[0]?.content ?? '', /language they use or request/u);
  assert.deepEqual(supabase.calls.matchChunks, []);
});

test('Portuguese Gaspar identity questions retrieve the assistant profile source without embeddings', async () => {
  const gaspar = source('gaspar-id', 'Gaspar', null, 'homepage', 'assistant-profile');
  const supabase = createSupabase({
    sources: [gaspar],
    chunks: [
      chunk(
        'gaspar-id',
        'assistant-profile',
        'My name is Gaspar. I was born in Caniço, Madeira, in 2019.'
      ),
    ],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for Portuguese Gaspar identity questions');
  });

  const result = await askQuestion({
    question: 'Quem és tu?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Who is Gaspar?', {
      language: 'pt-PT',
      plan: { mode: 'direct_evidence', entity: 'Gaspar', subject: 'assistant profile' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['assistant-profile']);
  assert.equal(result.language, 'pt-PT');
  assert.match(result.contexts[0]?.content ?? '', /My name is Gaspar/u);
  assert.deepEqual(supabase.calls.matchChunks, []);
});

test('Portuguese colleague questions retrieve the public team source without embeddings', async () => {
  const team = source('team-id', 'ARG Team', null, 'about', 'arg-team');
  const supabase = createSupabase({
    sources: [team],
    chunks: [chunk('team-id', 'arg-team', 'José Antunes and Rui Rocha are ARG co-founders.')],
  });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for colleague questions');
  });

  const result = await askQuestion({
    question: 'E quem são os teus colegas?',
    config,
    readRepository: supabase.repository,
    answerProvider: createAnswerProvider('Who are the team members of ARG?', {
      language: 'pt-PT',
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
  assert.deepEqual(result.actions, [{ type: 'gaspar_message' }, { type: 'contact_form' }]);
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
      throw new EmbeddingQuotaExceededError('test', 'primary');
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
