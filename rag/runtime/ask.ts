import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type {
  AnswerProvider,
  AskQuestionResult,
  ChatMessage,
  EmbeddingProvider,
  PageContext,
  RetrievedContext,
} from '../types/ai.js';
import type { RagConfig } from '../types/config.js';
import {
  createArticleRecommendations,
  createAssistantActions,
  createCitations,
  createInsufficientContextActions,
  createPersonClarification,
  normalizeAssistantAnswer,
} from './answerOutput.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
  RagValidationError,
} from './inputValidation.js';
import { resolveRetrievalRoute } from './retrieval/route.js';
import { retrieveRoutedContexts } from './retrieval/retrieve.js';

export { RagValidationError, resolveRetrievalRoute };
export type { RetrievalRoute, RetrievalRouteKind } from './retrieval/route.js';

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: RagConfig;
  supabase?: SupabaseClient;
  answerProvider?: AnswerProvider;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
}

interface RuntimeContext {
  question: string;
  messages: ChatMessage[];
  pageContext: PageContext | null;
  config: RagConfig;
  supabase: SupabaseClient;
  answerProvider: AnswerProvider;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
}

export async function askQuestion(input: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const context = createRuntimeContext(input);
  const intent = await context.answerProvider.classifyQuestionIntent(
    context.question,
    context.messages
  );

  if (intent.intent !== 'rag_question') {
    const answer =
      intent.response ||
      (await context.answerProvider.generateIntentFallbackResponse(
        context.question,
        intent.intent,
        intent.language
      ));

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createAssistantActions(context.question),
      contexts: [],
    };
  }

  const plan = await context.answerProvider.planRetrieval(
    context.question,
    context.messages,
    context.pageContext
  );
  const retrievalQuestion = plan.query || context.question;
  const route = resolveRetrievalRoute(retrievalQuestion, plan);

  if (route.requiresPersonClarification) {
    return {
      answer: createPersonClarification(intent.language),
      citations: [],
      articleRecommendations: [],
      actions: [{ type: 'email_hello' }],
      contexts: [],
    };
  }

  const { contexts } = await retrieveRoutedContexts({
    retrievalQuestion,
    route,
    config: context.config,
    supabase: context.supabase,
    embeddingProvider: context.embeddingProvider,
    fallbackEmbeddingProvider: context.fallbackEmbeddingProvider,
  });

  if (contexts.length === 0) {
    const answer = await context.answerProvider.generateInsufficientContextAnswer(
      context.question,
      context.messages,
      intent.language
    );

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createInsufficientContextActions(context.question),
      contexts: [],
    };
  }

  const answer = await context.answerProvider.generateAnswer(
    context.question,
    context.messages,
    contexts,
    intent.language
  );

  return {
    answer: normalizeAssistantAnswer(answer),
    citations: createCitations(contexts, context.config.siteUrl),
    articleRecommendations: createArticleRecommendations(contexts, route, context.config.siteUrl),
    actions: createAssistantActions(context.question),
    contexts,
  };
}

export async function retrieveRelevantChunks(
  input: AskQuestionInput = {}
): Promise<RetrievedContext[]> {
  const context = createRuntimeContext(input);
  const plan = await context.answerProvider.planRetrieval(
    context.question,
    context.messages,
    context.pageContext
  );
  const query = input.retrievalQuestion?.trim() || plan.query || context.question;
  const route = resolveRetrievalRoute(query, plan);

  if (route.requiresPersonClarification) {
    return [];
  }

  const result = await retrieveRoutedContexts({
    retrievalQuestion: query,
    route,
    config: context.config,
    supabase: context.supabase,
    embeddingProvider: context.embeddingProvider,
    fallbackEmbeddingProvider: context.fallbackEmbeddingProvider,
  });

  return result.contexts;
}

function createRuntimeContext({
  question,
  messages,
  pageContext,
  config = getRagConfig(),
  supabase,
  answerProvider = deepSeekAnswerClient,
  embeddingProvider = geminiEmbeddingClient,
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
}: AskQuestionInput): RuntimeContext {
  return {
    question: normalizeQuestion(question),
    messages: normalizeMessages(messages),
    pageContext: normalizePageContext(pageContext),
    config,
    supabase: supabase ?? createSupabaseServiceClient(config),
    answerProvider,
    embeddingProvider,
    fallbackEmbeddingProvider,
  };
}
