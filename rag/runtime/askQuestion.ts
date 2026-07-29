import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type { ChatMessage, PageContext } from '../core/types/chat.js';
import type { RagConfig } from '../core/types/config.js';
import type { RetrievedContext } from '../core/types/context.js';
import type { AskQuestionResult } from '../core/types/output.js';
import type { AnswerProvider, EmbeddingProvider } from '../core/types/providers.js';
import type { RagReadRepository } from '../repositories/RagReadRepository.js';
import { SupabaseRagReadRepository } from '../repositories/supabase/SupabaseRagReadRepository.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
  RagValidationError,
} from './inputValidation.js';
import { createRoutedRetrievalItems } from './planning/createRetrievalItems.js';
import { createSemanticEmbeddings } from './planning/createSemanticEmbeddings.js';
import { resolveRetrievalRoute } from './retrieval/route.js';
import { retrieveRoutedContexts } from './retrieval/retrieve.js';
import { mergeRetrievedContexts } from './retrieval/vectorSearch.js';
import { createAssistantActions, createInsufficientContextActions } from './response/actions.js';
import { buildAnswerQuestion } from './response/buildAnswerQuestion.js';
import { createAnswerResult } from './response/createAnswer.js';
import { normalizeAssistantAnswer } from './response/normalizeAnswer.js';
import { createPersonClarification } from './response/personClarification.js';
import { createUnconfirmedTechnologyAnswer } from './response/unconfirmedTechnologyAnswer.js';

export { RagValidationError, resolveRetrievalRoute };
export type { RetrievalRoute, RetrievalRouteKind } from './retrieval/route.js';

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: RagConfig;
  readRepository?: RagReadRepository;
  answerProvider?: AnswerProvider;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
}

interface RuntimeContext {
  question: string;
  messages: ChatMessage[];
  pageContext: PageContext | null;
  config: RagConfig;
  readRepository: RagReadRepository;
  answerProvider: AnswerProvider;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
}

export async function askQuestion(input: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const context = createRuntimeContext(input);
  const intent = await context.answerProvider.classifyQuestionIntent(
    context.question,
    context.messages,
    context.pageContext
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
  const routedItems = createRoutedRetrievalItems(plan, context.question, context.pageContext);

  if (routedItems.every(item => item.route.requiresPersonClarification)) {
    return {
      answer: createPersonClarification(intent.language),
      citations: [],
      articleRecommendations: [],
      actions: [{ type: 'gaspar_message' }, { type: 'contact_form' }],
      contexts: [],
    };
  }

  const embeddings = await createSemanticEmbeddings(
    routedItems,
    context.embeddingProvider,
    context.fallbackEmbeddingProvider
  );
  const retrievalResults = await Promise.all(
    routedItems.map(async (item, index) => {
      if (item.route.requiresPersonClarification) {
        return { ...item, contexts: [] as RetrievedContext[] };
      }

      const semanticSearch = embeddings.get(index);
      const result = await retrieveRoutedContexts({
        retrievalQuestion: item.retrievalQuestion,
        route: item.route,
        config: context.config,
        readRepository: context.readRepository,
        embeddingProvider: context.embeddingProvider,
        fallbackEmbeddingProvider: context.fallbackEmbeddingProvider,
        embedding: semanticSearch?.embedding,
        index: semanticSearch?.index,
      });

      return { ...item, contexts: result.contexts };
    })
  );
  const contexts = mergeRetrievedContexts(
    retrievalResults.map(result => result.contexts),
    Number.MAX_SAFE_INTEGER
  );

  if (contexts.length === 0) {
    const unconfirmedTechnologyAnswer = createUnconfirmedTechnologyAnswer(
      retrievalResults,
      intent.language
    );

    if (unconfirmedTechnologyAnswer) {
      return {
        answer: unconfirmedTechnologyAnswer,
        citations: [],
        articleRecommendations: [],
        actions: createInsufficientContextActions(context.question),
        contexts: [],
      };
    }

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
    buildAnswerQuestion(context.question, retrievalResults),
    context.messages,
    contexts,
    intent.language
  );

  return createAnswerResult({
    answer,
    question: context.question,
    contexts,
    retrievalResults,
    siteUrl: context.config.siteUrl,
  });
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
  const routedItem = createRoutedRetrievalItems(
    { ...plan, query: input.retrievalQuestion?.trim() || plan.query },
    context.question,
    context.pageContext
  )[0];
  const query = routedItem?.retrievalQuestion || context.question;
  const route = routedItem?.route || resolveRetrievalRoute(query, plan);

  if (route.requiresPersonClarification) {
    return [];
  }

  const result = await retrieveRoutedContexts({
    retrievalQuestion: query,
    route,
    config: context.config,
    readRepository: context.readRepository,
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
  readRepository,
  answerProvider = deepSeekAnswerClient,
  embeddingProvider = geminiEmbeddingClient,
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
}: AskQuestionInput): RuntimeContext {
  return {
    question: normalizeQuestion(question),
    messages: normalizeMessages(messages),
    pageContext: normalizePageContext(pageContext),
    config,
    readRepository:
      readRepository ??
      new SupabaseRagReadRepository(createSupabaseServiceClient(config), config.siteUrl),
    answerProvider,
    embeddingProvider,
    fallbackEmbeddingProvider,
  };
}
