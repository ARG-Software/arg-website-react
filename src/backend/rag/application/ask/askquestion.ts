import type { IChatMessage, IPageContext } from '../../domain/conversation/ichatmessage.js';
import type { IRagConfig } from '../config/irag.configuration.js';
import type { IRetrievedContext } from '../../domain/retrieval/iretrievedcontext.js';
import type { IAskQuestionResult } from '../../domain/assistant/assistant.response.js';
import type { IAnswerProvider, IEmbeddingProvider } from '../ports/iproviderports.js';
import type { IRagReadRepository } from '../ports/iragread.repository.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
  RagValidationError,
} from './inputvalidation.js';
import { createRoutedRetrievalItems } from './planning/createretrievalitems.js';
import { createSemanticEmbeddings } from './planning/createsemanticembeddings.js';
import { resolveRetrievalRoute } from './retrieval/route.js';
import { retrieveRoutedContexts } from './retrieval/retrieve.js';
import { mergeRetrievedContexts } from './retrieval/vectorsearch.js';
import { createAssistantActions, createInsufficientContextActions } from './response/actions.js';
import { buildAnswerQuestion } from './response/buildanswerquestion.js';
import { createAnswerResult } from './response/createanswer.js';
import { normalizeAssistantAnswer } from './response/normalizeanswer.js';
import { normalizeLanguage } from '../common/language.js';
import { createUnconfirmedTechnologyAnswer } from './response/unconfirmedtechnologyanswer.js';
import { resolveLanguagePolicy } from '../assistant/language.policy.js';

export { RagValidationError, resolveRetrievalRoute };
export type { IRetrievalRoute, RetrievalRouteKind } from './retrieval/route.js';

export interface IAskQuestionInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: IRagConfig;
  readRepository?: IRagReadRepository;
  answerProvider?: IAnswerProvider;
  embeddingProvider?: IEmbeddingProvider;
  fallbackEmbeddingProvider?: IEmbeddingProvider;
  preferredLanguage?: string;
}

interface IRuntimeContext {
  question: string;
  messages: IChatMessage[];
  pageContext: IPageContext | null;
  config: IRagConfig;
  readRepository: IRagReadRepository;
  answerProvider: IAnswerProvider;
  embeddingProvider: IEmbeddingProvider;
  fallbackEmbeddingProvider: IEmbeddingProvider;
}

export async function askQuestion(input: IAskQuestionInput = {}): Promise<IAskQuestionResult> {
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
    const answer = await context.answerProvider.generatePersonClarification(
      context.question,
      responseLanguage
    );

    return {
      answer: normalizeAssistantAnswer(answer),
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
        return { ...item, contexts: [] as IRetrievedContext[] };
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
): Pick<IAskQuestionResult, 'languagePreference'> {
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

function getLatestAssistantAnswer(messages: IChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant') return message.content;
  }

  return null;
}

export async function retrieveRelevantChunks(
  input: IAskQuestionInput = {}
): Promise<IRetrievedContext[]> {
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
}: IAskQuestionInput): IRuntimeContext {
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
