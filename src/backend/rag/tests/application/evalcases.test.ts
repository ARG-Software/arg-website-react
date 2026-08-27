import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executableRagEvalCases,
  ragEvalPromptBank,
  type IEvalChunkRow,
  type IEvalMatchRow,
  type IEvalSourceRow,
  type IRagEvalCase,
} from '../evals/cases.js';
import type { IRetrievedContext } from '../../domain/retrieval/iretrievedcontext.js';
import { createFakeAnswerProvider } from '../fakes/fakeanswer.provider.js';
import { createFakeEmbeddingProvider } from '../fakes/fakeembedding.provider.js';
import { FakeRagReadRepository } from '../fakes/fakeragread.repository.js';
import { createTestConfig } from '../fixtures/config.js';
import type { IChunkFixture } from '../fixtures/sources.js';
import type { IRagSourceRecord } from '../../application/ports/iragread.repository.js';
import { askQuestion } from '../../application/ask/askquestion.js';

const config = createTestConfig();

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
    const readRepository = createReadRepository({
      sources: ragCase.sources ?? [],
      chunks: ragCase.chunks ?? [],
      rpcRows: ragCase.rpcRows ?? [],
    });
    const embeddingProvider = createFakeEmbeddingProvider(texts => {
      embeddingBatches.push(texts);
      return texts.map((_, index) => [index + 0.1, index + 0.2]);
    });

    const result = await askQuestion({
      question: ragCase.question,
      messages: ragCase.messages,
      pageContext: ragCase.pageContext,
      config: { ...config, matchCount: ragCase.matchCount ?? config.matchCount },
      readRepository,
      answerProvider: createAnswerProviderForCase(ragCase, generatedQuestions),
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
      assert.deepEqual(readRepository.calls.matchChunks, []);
    }

    if (expected.embeddingBatches) {
      assert.deepEqual(embeddingBatches, expected.embeddingBatches);
    }
  });
}

function createAnswerProviderForCase(ragCase: IRagEvalCase, generatedQuestions: string[]) {
  return createFakeAnswerProvider(ragCase.question, {
    intent: ragCase.intent ?? 'rag_question',
    intentResponse: ragCase.intentResponse ?? '',
    plan: ragCase.plan,
    generatedAnswer: ragCase.generatedAnswer ?? 'Grounded answer.',
    insufficientContextAnswer: ragCase.generatedAnswer ?? 'Please send us a message so we can help.',
    intentFallbackResponse: ragCase.intentResponse ?? 'Please ask about our website.',
    onGenerateAnswer: question => {
      generatedQuestions.push(question);
    },
  });
}

function createReadRepository({
  sources,
  chunks,
  rpcRows,
}: {
  sources: IEvalSourceRow[];
  chunks: IEvalChunkRow[];
  rpcRows: IEvalMatchRow[];
}): FakeRagReadRepository {
  return new FakeRagReadRepository({
    sources: sources.map(toSourceRecord),
    chunks: chunks.map(toChunkFixture),
    contexts: rpcRows.map(toContextFixture),
  });
}

function toSourceRecord(row: IEvalSourceRow): IRagSourceRecord {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: row.url,
    path: row.path,
    origin: row.origin,
    isPublic: row.is_public,
    metadata: row.metadata,
  };
}

function toChunkFixture(row: IEvalChunkRow): IChunkFixture {
  return {
    id: row.id,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    metadata: row.metadata ?? {},
  };
}

function toContextFixture(row: IEvalMatchRow): IRetrievedContext {
  return {
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: row.url,
    path: row.path,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
    sourceMetadata: row.source_metadata ?? {},
    chunkMetadata: row.chunk_metadata ?? {},
    origin: row.origin,
  };
}
