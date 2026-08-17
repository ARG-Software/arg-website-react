import type { ChatMessage, PageContext } from '../../domain/conversation/ChatMessage.js';
import type { RagConfig } from '../ragConfig.js';
import type { RetrievedContext } from '../../domain/retrieval/RetrievedContext.js';
import type { AskQuestionResult } from '../../domain/assistant/AssistantResponse.js';
import type { AnswerProvider, EmbeddingProvider } from '../ports/ProviderPorts.js';
import type { RagReadRepository } from '../ports/RagReadRepository.js';
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
import { normalizeLanguage } from '../common/language.js';
import { createPersonClarification } from './response/personClarification.js';
import { createUnconfirmedTechnologyAnswer } from './response/unconfirmedTechnologyAnswer.js';
import { resolveLanguagePolicy } from '../assistant/languagePolicy.js';

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
  preferredLanguage?: string;
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
  const languagePolicy = resolveLanguagePolicy({
    question: context.question,
    detectedLanguage: normalizeLanguage(intent.language),
    preferredLanguage: input.preferredLanguage,
  });
  const responseLanguage = languagePolicy.responseLanguage;
  const languagePreference = createLanguagePreferenceResult(languagePolicy);

  if (intent.intent === 'conversation_transform') {
    const previousAnswer = getLatestAssistantAnswer(context.messages);

    if (!previousAnswer) {
      return {
        answer: 'Please ask me what you want clarified, and I will make it easier to follow.',
        language: responseLanguage,
        ...languagePreference,
        citations: [],
        articleRecommendations: [],
        actions: [],
        contexts: [],
      };
    }

    const answer = await context.answerProvider.rewritePreviousAnswer(
      context.question,
      previousAnswer,
      intent.task || 'simplify_previous_answer',
      responseLanguage
    );

    return {
      answer: normalizeAssistantAnswer(answer),
      language: responseLanguage,
      ...languagePreference,
      citations: [],
      articleRecommendations: [],
      actions: [],
      contexts: [],
    };
  }

  if (intent.intent !== 'rag_question') {
    const answer =
      intent.response ||
      (await context.answerProvider.generateIntentFallbackResponse(
        context.question,
        intent.intent,
        responseLanguage
      ));

    return {
      answer: normalizeAssistantAnswer(answer),
      language: responseLanguage,
      ...languagePreference,
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
      answer: createPersonClarification(responseLanguage),
      language: responseLanguage,
      ...languagePreference,
      citations: [],
      articleRecommendations: [],
      actions: [{ type: 'gaspar_message' }],
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
      responseLanguage
    );

    if (unconfirmedTechnologyAnswer) {
      return {
          answer: unconfirmedTechnologyAnswer,
          language: responseLanguage,
          ...languagePreference,
        citations: [],
        articleRecommendations: [],
        actions: createInsufficientContextActions(context.question),
        contexts: [],
      };
    }

    const answer = await context.answerProvider.generateInsufficientContextAnswer(
      context.question,
      context.messages,
      responseLanguage
    );

    return {
      answer: normalizeAssistantAnswer(answer),
      language: responseLanguage,
      ...languagePreference,
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
    responseLanguage
  );

  return createAnswerResult({
    answer,
    language: responseLanguage,
    languagePreference,
    question: context.question,
    contexts,
    retrievalResults,
    siteUrl: context.config.siteUrl,
    pageContext: context.pageContext,
  });
}

function createLanguagePreferenceResult(
  languagePolicy: ReturnType<typeof resolveLanguagePolicy>
): Pick<AskQuestionResult, 'languagePreference'> {
  if (languagePolicy.preferenceAction === 'none') {
    return {};
  }

  return {
    languagePreference: {
      action: languagePolicy.preferenceAction,
      ...(languagePolicy.preferredLanguage ? { language: languagePolicy.preferredLanguage } : {}),
    },
  };
}

function getLatestAssistantAnswer(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant') return message.content;
  }

  return null;
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
  config,
  readRepository,
  answerProvider,
  embeddingProvider,
  fallbackEmbeddingProvider,
}: AskQuestionInput): RuntimeContext {
  const runtimeConfig = requireDependency(config, 'RAG config');

  return {
    question: normalizeQuestion(question),
    messages: normalizeMessages(messages),
    pageContext: normalizePageContext(pageContext),
    config: runtimeConfig,
    readRepository: requireDependency(readRepository, 'RAG read repository'),
    answerProvider: requireDependency(answerProvider, 'answer provider'),
    embeddingProvider: requireDependency(embeddingProvider, 'embedding provider'),
    fallbackEmbeddingProvider: requireDependency(
      fallbackEmbeddingProvider,
      'fallback embedding provider'
    ),
  };
}

function requireDependency<T>(dependency: T | undefined, label: string): T {
  if (!dependency) {
    throw new Error(`${label} is required`);
  }

  return dependency;
}
