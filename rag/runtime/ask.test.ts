import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiEmbeddingQuotaError } from '../clients/gemini.js';
import { askQuestion, retrieveRelevantChunks, resolveRetrievalRoute } from './ask.js';
import type { AnswerProvider, EmbeddingProvider, RetrievalPlan } from '../types/ai.js';
import type { RagConfig } from '../types/config.js';
import type { RagSourceOrigin, RagSourceType } from '../types/source.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const config: RagConfig = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceRoleKey: 'test-key',
  geminiApiKey: 'test-key',
  geminiEmbeddingModel: 'primary',
  geminiEmbeddingDimensions: 2,
  geminiFallbackEmbeddingModel: 'fallback',
  geminiFallbackEmbeddingDimensions: 2,
  geminiEmbeddingRequestDelayMs: 0,
  deepseekApiKey: 'test-key',
  deepseekModel: 'test-model',
  siteUrl: 'https://arg.software',
  companyName: 'ARG Software',
  chunkSize: 1200,
  chunkOverlap: 180,
  matchCount: 1,
  similarityThreshold: 0.72,
  fallbackSimilarityThreshold: 0.6,
};

test('latest articles retrieve the newest three dated blog posts without embeddings', async () => {
  const sources = [
    source('old', 'Old post', 'June 1, 2026'),
    source('newest', 'Newest post', 'July 3, 2026'),
    source('middle', 'Middle post', 'July 2, 2026'),
    source('third', 'Third post', 'July 1, 2026'),
    source('invalid', 'Invalid post', null),
  ];
  const chunks = sources.map(item => chunk(item.id, item.source_key));
  const supabase = createSupabase({ sources, chunks });
  const embeddingProvider = createEmbeddingProvider(() => {
    throw new Error('Embeddings must not be generated for latest posts');
  });

  const result = await askQuestion({
    question: 'Latest articles?',
    config,
    supabase: supabase.client,
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
  assert.equal(supabase.calls.rpc.length, 0);
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

test('blog metadata remains retrievable through the general route', async () => {
  const supabase = createSupabase({
    rpcRows: [matchRow('blog_post', 'blog-post', 'Blog post', 'Blog post\nTitle: Blog post')],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Do you have blog posts?',
    retrievalQuestion: 'Do you have blog posts?',
    config,
    supabase: supabase.client,
    answerProvider: createAnswerProvider('Do you have blog posts?', {
      plan: { mode: 'article_discovery', entity: '', subject: 'blog posts' },
    }),
    embeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(contexts[0]?.sourceType, 'blog_post');
  assert.match(contexts[0]?.content ?? '', /^Blog post/u);
  assert.deepEqual(supabase.calls.rpc[0]?.source_types, ['blog_post']);
});

test('fintech questions use official project evidence before technical blog retrieval', async () => {
  const supabase = createSupabase({
    rpcRows: [matchRow('project', 'mojaloop', 'Mojaloop', 'Payment infrastructure evidence')],
  });

  const contexts = await retrieveRelevantChunks({
    question: 'Can you build AI for fintech?',
    retrievalQuestion: 'Can ARG Software build AI for fintech?',
    config,
    supabase: supabase.client,
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
  assert.deepEqual(supabase.calls.rpc[0]?.source_types, [
    'homepage',
    'about',
    'project',
    'partner',
    'careers',
    'working_with_us',
  ]);
  assert.deepEqual(supabase.calls.rpc[1]?.source_types, ['faq']);
  assert.deepEqual(supabase.calls.rpc[2]?.source_types, ['external_page']);
  assert.deepEqual(supabase.calls.rpc[2]?.source_origins, ['trusted_external']);
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
  });

  const result = await askQuestion({
    question: 'Does he know Python?',
    messages: [
      { role: 'user', content: 'Tell me about Rui Rocha.' },
      { role: 'assistant', content: 'Rui is an ARG co-founder.' },
    ],
    config: { ...config, matchCount: 6 },
    supabase: supabase.client,
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
  });

  const result = await askQuestion({
    question: 'Does Jose know C#?',
    config: { ...config, matchCount: 6 },
    supabase: supabase.client,
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
    supabase: supabase.client,
    answerProvider: createAnswerProvider('Does Jose know Go?', {
      plan: { mode: 'direct_evidence', entity: 'Jose', subject: 'Go' },
    }),
    embeddingProvider: createEmbeddingProvider(() => {
      throw new Error('No embedding should be generated for missing personal evidence');
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(result.answer, 'Please send us a message so we can help.');
  assert.deepEqual(result.contexts, []);
  assert.deepEqual(result.articleRecommendations, []);
  assert.deepEqual(supabase.calls.rpc, []);
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
    supabase: supabase.client,
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
    supabase: supabase.client,
    answerProvider: createAnswerProvider('Who are the team members of ARG?', {
      plan: { mode: 'direct_evidence', entity: 'ARG Team', subject: '' },
    }),
    embeddingProvider,
    fallbackEmbeddingProvider: embeddingProvider,
  });

  assert.deepEqual(result.contexts.map(context => context.sourceKey), ['arg-team']);
  assert.deepEqual(supabase.calls.rpc, []);
});

test('an unresolved personal pronoun asks for clarification', async () => {
  const result = await askQuestion({
    question: 'Does he know Python?',
    config,
    supabase: createSupabase({}).client,
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
    supabase: supabase.client,
    answerProvider: createAnswerProvider('Explain Python architecture', {
      plan: { mode: 'direct_evidence', entity: '', subject: 'Python architecture' },
    }),
    embeddingProvider: createEmbeddingProvider(() => {
      throw new GeminiEmbeddingQuotaError('primary');
    }),
    fallbackEmbeddingProvider: createEmbeddingProvider(() => [[0.1, 0.2]]),
  });

  assert.equal(supabase.calls.rpc[0]?.functionName, 'match_rag_chunks_fallback');
});

function createAnswerProvider(
  rewrite: string,
  {
    intent = 'rag_question',
    plan,
  }: { intent?: 'rag_question' | 'unsupported'; plan?: Partial<RetrievalPlan> } = {}
): AnswerProvider {
  const retrievalPlan: RetrievalPlan = {
    query: rewrite,
    mode: 'direct_evidence',
    entity: '',
    subject: '',
    ...plan,
  };

  return {
    async classifyQuestionIntent() {
      return { intent, response: '', language: 'en' };
    },
    async planRetrieval() {
      return retrievalPlan;
    },
    async generateAnswer() {
      return 'Grounded answer.';
    },
    async generateInsufficientContextAnswer() {
      return 'Please send us a message so we can help.';
    },
    async generateIntentFallbackResponse() {
      return 'Please ask about our website.';
    },
  };
}

function createEmbeddingProvider(
  embedTexts: (texts: string[]) => number[][] | Promise<number[][]>
): EmbeddingProvider {
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

function source(
  id: string,
  title: string,
  date: string | null,
  sourceType: RagSourceType = 'blog_post',
  sourceKey = id,
  metadata: Record<string, unknown> = {}
) {
  return {
    id,
    source_type: sourceType,
    source_key: sourceKey,
    title,
    url: `/blog/${sourceKey}/`,
    path: null,
    origin: 'first_party' as RagSourceOrigin,
    is_public: true,
    metadata: { ...(date ? { date } : {}), ...metadata },
  };
}

function chunk(sourceId: string, suffix: string, content = `Blog post ${suffix}`) {
  return {
    id: `chunk-${suffix}`,
    source_id: sourceId,
    chunk_index: 0,
    content,
    metadata: {},
  };
}

function matchRow(sourceType: RagSourceType, sourceKey: string, title: string, content: string) {
  return {
    chunk_id: `chunk-${sourceKey}`,
    source_id: `source-${sourceKey}`,
    source_type: sourceType,
    source_key: sourceKey,
    title,
    url: `/blog/${sourceKey}/`,
    path: null,
    chunk_index: 0,
    content,
    similarity: 0.9,
    source_metadata: {},
    chunk_metadata: {},
  };
}

function createSupabase({
  sources = [],
  chunks = [],
  rpcRows = [],
}: {
  sources?: ReturnType<typeof source>[];
  chunks?: ReturnType<typeof chunk>[];
  rpcRows?: ReturnType<typeof matchRow>[];
}) {
  const calls: {
    rpc: Array<{
      functionName: string;
      source_types: RagSourceType[] | null;
      source_origins?: string[] | null;
    }>;
  } = { rpc: [] };

  const client = {
    from(table: 'rag_sources' | 'rag_chunks') {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      let limit: number | undefined;
      const query = {
        select() {
          return query;
        },
        eq(field: string, value: unknown) {
          filters.push(row => row[field] === value);
          return query;
        },
        in(field: string, values: unknown[]) {
          filters.push(row => values.includes(row[field]));
          return query;
        },
        ilike(field: string, pattern: string) {
          const search = pattern.replace(/%/gu, '').toLowerCase();
          filters.push(row => String(row[field] ?? '').toLowerCase().includes(search));
          return query;
        },
        order() {
          return query;
        },
        limit(value: number) {
          limit = value;
          return query;
        },
        maybeSingle: async () => {
          const rows = getRows();
          return { data: rows[0] ?? null, error: null };
        },
        then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) {
          return Promise.resolve({ data: getRows(), error: null }).then(onfulfilled, onrejected);
        },
      };

      function getRows() {
        const rows = table === 'rag_sources' ? sources : chunks;
        return rows
          .filter(row => filters.every(filter => filter(row as Record<string, unknown>)))
          .slice(0, limit);
      }

      return query;
    },
    async rpc(
      functionName: string,
      parameters: { source_types: RagSourceType[] | null; source_origins?: string[] | null }
    ) {
      calls.rpc.push({
        functionName,
        source_types: parameters.source_types,
        source_origins: parameters.source_origins,
      });
      return { data: rpcRows, error: null };
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}
