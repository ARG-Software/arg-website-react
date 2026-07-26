import assert from 'node:assert/strict';
import test from 'node:test';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  executableRagEvalCases,
  ragEvalPromptBank,
  type EvalChunkRow,
  type EvalMatchRow,
  type EvalSourceRow,
  type RagEvalCase,
} from '../evals/cases.js';
import type { AnswerProvider, EmbeddingProvider, RetrievalPlan } from '../types/ai.js';
import type { RagConfig } from '../types/config.js';
import type { RagSourceOrigin, RagSourceType } from '../types/source.js';
import { askQuestion } from './ask.js';

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
  matchCount: 6,
  similarityThreshold: 0.72,
  fallbackSimilarityThreshold: 0.6,
};

test('RAG eval prompt bank has broad, non-duplicated coverage', () => {
  const prompts = Object.values(ragEvalPromptBank).flat();
  const normalizedPrompts = prompts.map(prompt => prompt.toLowerCase().trim());

  assert.ok(prompts.length >= 100);
  assert.equal(new Set(normalizedPrompts).size, prompts.length);
  assert.ok(ragEvalPromptBank.oneLineMultiQuestion.length >= 10);
  assert.ok(ragEvalPromptBank.historySafety.length >= 8);
  assert.ok(ragEvalPromptBank.promptInjection.length >= 6);
});

for (const ragCase of executableRagEvalCases) {
  test(`RAG eval: ${ragCase.id}`, async () => {
    const generatedQuestions: string[] = [];
    const embeddingBatches: string[][] = [];
    const supabase = createSupabase({
      sources: ragCase.sources ?? [],
      chunks: ragCase.chunks ?? [],
      rpcRows: ragCase.rpcRows ?? [],
    });
    const embeddingProvider = createEmbeddingProvider(texts => {
      embeddingBatches.push(texts);
      return texts.map((_, index) => [index + 0.1, index + 0.2]);
    });

    const result = await askQuestion({
      question: ragCase.question,
      messages: ragCase.messages,
      pageContext: ragCase.pageContext,
      config: { ...config, matchCount: ragCase.matchCount ?? config.matchCount },
      supabase: supabase.client,
      answerProvider: createAnswerProvider(ragCase, generatedQuestions),
      embeddingProvider,
      fallbackEmbeddingProvider: embeddingProvider,
    });

    const expected = ragCase.expected ?? {};
    const sourceKeys = result.contexts.map(context => context.sourceKey);
    const sourceTypes = new Set(result.contexts.map(context => context.sourceType));
    const articleTitles = result.articleRecommendations.map(article => article.title);
    const actionTypes = result.actions.map(action => action.type);

    if (expected.answer) {
      assert.equal(result.answer, expected.answer);
    }

    for (const pattern of expected.answerPatterns ?? []) {
      assert.match(result.answer, pattern);
    }

    for (const pattern of expected.generatedQuestionPatterns ?? []) {
      assert.ok(
        generatedQuestions.some(question => pattern.test(question)),
        `${ragCase.id} did not match generated-question pattern ${pattern}`
      );
    }

    for (const pattern of expected.forbiddenGeneratedQuestionPatterns ?? []) {
      assert.ok(
        generatedQuestions.every(question => !pattern.test(question)),
        `${ragCase.id} matched forbidden generated-question pattern ${pattern}`
      );
    }

    for (const sourceKey of expected.sourceKeys ?? []) {
      assert.ok(sourceKeys.includes(sourceKey), `${ragCase.id} did not retrieve ${sourceKey}`);
    }

    for (const sourceType of expected.sourceTypes ?? []) {
      assert.ok(sourceTypes.has(sourceType), `${ragCase.id} did not retrieve ${sourceType}`);
    }

    for (const sourceKey of expected.forbiddenSourceKeys ?? []) {
      assert.ok(!sourceKeys.includes(sourceKey), `${ragCase.id} retrieved forbidden ${sourceKey}`);
    }

    for (const title of expected.articleRecommendationTitles ?? []) {
      assert.ok(articleTitles.includes(title), `${ragCase.id} did not recommend ${title}`);
    }

    if (expected.actions) {
      assert.deepEqual(actionTypes, expected.actions);
    }

    if (expected.noContexts) {
      assert.deepEqual(result.contexts, []);
    }

    if (expected.noRpc) {
      assert.deepEqual(supabase.calls.rpc, []);
    }

    if (expected.embeddingBatches) {
      assert.deepEqual(embeddingBatches, expected.embeddingBatches);
    }
  });
}

function createAnswerProvider(ragCase: RagEvalCase, generatedQuestions: string[]): AnswerProvider {
  const retrievalPlan: RetrievalPlan = {
    query: ragCase.question,
    mode: 'direct_evidence',
    entity: '',
    subject: '',
    ...ragCase.plan,
  };

  return {
    async classifyQuestionIntent() {
      return {
        intent: ragCase.intent ?? 'rag_question',
        response: ragCase.intentResponse ?? '',
        language: 'en',
      };
    },
    async planRetrieval() {
      return retrievalPlan;
    },
    async generateAnswer(question) {
      generatedQuestions.push(question);
      return ragCase.generatedAnswer ?? 'Grounded answer.';
    },
    async generateInsufficientContextAnswer() {
      return ragCase.generatedAnswer ?? 'Please send us a message so we can help.';
    },
    async generateIntentFallbackResponse() {
      return ragCase.intentResponse ?? 'Please ask about our website.';
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

function createSupabase({
  sources,
  chunks,
  rpcRows,
}: {
  sources: EvalSourceRow[];
  chunks: EvalChunkRow[];
  rpcRows: EvalMatchRow[];
}) {
  const calls: {
    rpc: Array<{
      functionName: string;
      source_types: RagSourceType[] | null;
      source_keys?: string[] | null;
      source_origins?: RagSourceOrigin[] | null;
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
          onfulfilled?:
            | ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>)
            | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) {
          return Promise.resolve({ data: getRows(), error: null }).then(onfulfilled, onrejected);
        },
      };

      function getRows() {
        const rows = table === 'rag_sources' ? sources : chunks;
        return rows
          .filter(row => filters.every(filter => filter(row as unknown as Record<string, unknown>)))
          .slice(0, limit);
      }

      return query;
    },
    async rpc(
      functionName: string,
      parameters: {
        source_types: RagSourceType[] | null;
        source_keys?: string[] | null;
        source_origins?: RagSourceOrigin[] | null;
      }
    ) {
      calls.rpc.push({
        functionName,
        source_types: parameters.source_types,
        source_keys: parameters.source_keys,
        source_origins: parameters.source_origins,
      });

      return {
        data: rpcRows.filter(row => {
          const matchesSourceType =
            !parameters.source_types || parameters.source_types.includes(row.source_type);
          const matchesSourceKey =
            !parameters.source_keys || parameters.source_keys.includes(row.source_key);
          const matchesSourceOrigin =
            !parameters.source_origins || parameters.source_origins.includes(row.origin);

          return matchesSourceType && matchesSourceKey && matchesSourceOrigin;
        }),
        error: null,
      };
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}
