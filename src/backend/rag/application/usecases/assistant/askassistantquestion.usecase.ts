import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IChatMessage } from '../../../domain/conversation/chatmessage.types.js';
import type { ConversationTransformTask } from '../../../domain/conversation/conversationtransform.types.js';
import type { IAskQuestionResult } from '../../../domain/answers/assistantanswer.types.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import { resolveLanguagePolicy } from '../../../domain/assistant/languagepolicy.js';
import { createRoutedRetrievalItems } from '../../../domain/routing/retrievalitems.js';
import { mergeRetrievedContexts } from '../../../domain/sources/contextmerge.js';
import { createAssistantActions, createInsufficientContextActions } from '../../../domain/assistant/actions.js';
import { normalizeAssistantAnswer } from '../../../domain/answers/answerpolicy.js';
import { createUnconfirmedTechnologyAnswer } from '../../../domain/answers/unconfirmedtechnologyanswer.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
} from '../../../domain/conversation/inputvalidation.js';
import type { IRagConfig } from '../../config/irag.configuration.js';
import type { ILlmProvider } from '../../ports/iproviderports.js';
import { getLanguageTagForName } from '../../config/languages.config.js';
import {
  getHomepageSectionScope,
  getKnownProjectNames,
  getProjectNameBySlug,
  getStaticPageSourceKeys,
} from '../../config/sourcecatalog.config.js';
import { SemanticRetrievalEmbeddingPlanner } from '../../retrievalplanning/createsemanticembeddings.js';
import { RoutedContextRetriever } from '../../retrieval/routedcontextretriever.js';
import { buildAnswerQuestion } from '../../answering/buildanswerquestion.js';
import { createAnswerResult } from '../../answering/createanswer.js';
import { normalizeLanguage } from '../../shared/language.js';

export interface AskAssistantQuestionInput {
  messages?: unknown;
  pageContext?: unknown;
  preferredLanguage?: string;
  question?: unknown;
}

export class AskAssistantQuestionUseCase {
  constructor(
    private readonly config: IRagConfig,
    private readonly answerProvider: ILlmProvider,
    private readonly semanticEmbeddingPlanner: SemanticRetrievalEmbeddingPlanner,
    private readonly routedContextRetriever: RoutedContextRetriever,
    private readonly logger?: ILogger
  ) {}

  async execute(input: AskAssistantQuestionInput): Promise<IAskQuestionResult> {
    return logOperation(
      this.logger,
      'Assistant ask use case',
      {
        hasQuestion: Boolean(input.question),
        hasMessages: Boolean(input.messages),
        hasPageContext: Boolean(input.pageContext),
        preferredLanguage: input.preferredLanguage,
      },
      () => this.answerQuestion(input),
      result => ({
        language: result.language,
        citationCount: result.citations.length,
        contextCount: result.contexts?.length ?? 0,
        actionCount: result.actions.length,
      })
    );
  }

  private async answerQuestion(input: AskAssistantQuestionInput): Promise<IAskQuestionResult> {
    const question = normalizeQuestion(input.question);
    const messages = normalizeMessages(input.messages);
    const pageContext = normalizePageContext(input.pageContext, {
      getHomepageSectionScope,
      getProjectNameBySlug,
      getStaticPageSourceKeys,
    });
    const intent = await this.answerProvider.classifyQuestionIntent(question, messages, pageContext);
    const languagePolicy = resolveLanguagePolicy({
      question,
      detectedLanguage: normalizeLanguage(intent.language),
      preferredLanguage: input.preferredLanguage,
      getLanguageTagForName,
    });
    const responseLanguage = languagePolicy.responseLanguage;
    const languagePreference = createLanguagePreferenceResult(languagePolicy);

    if (intent.intent === 'conversation_transform') {
      return this.rewritePreviousAnswer(question, messages, intent.task || 'simplify_previous_answer', responseLanguage, languagePreference);
    }

    if (intent.intent !== 'rag_question') {
      const answer =
        intent.response ||
        (await this.answerProvider.generateIntentFallbackResponse(question, intent.intent, responseLanguage));

      return {
        answer: normalizeAssistantAnswer(answer),
        language: responseLanguage,
        ...languagePreference,
        citations: [],
        articleRecommendations: [],
        actions: createAssistantActions(question),
        contexts: [],
      };
    }

    const plan = await this.answerProvider.planRetrieval(question, messages, pageContext);
    const routedItems = createRoutedRetrievalItems(plan, question, pageContext, getKnownProjectNames());

    if (routedItems.every(item => item.route.requiresPersonClarification)) {
      const answer = await this.answerProvider.generatePersonClarification(question, responseLanguage);

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

    const embeddings = await this.semanticEmbeddingPlanner.createEmbeddings(routedItems);
    const retrievalResults = await Promise.all(
      routedItems.map(async (item, index) => {
        if (item.route.requiresPersonClarification) {
          return { ...item, contexts: [] as IRetrievedContext[] };
        }

        const semanticSearch = embeddings.get(index);
        const result = await this.routedContextRetriever.retrieve({
          retrievalQuestion: item.retrievalQuestion,
          route: item.route,
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
      const unconfirmedTechnologyAnswer = createUnconfirmedTechnologyAnswer(retrievalResults, responseLanguage);

      if (unconfirmedTechnologyAnswer) {
        return {
          answer: unconfirmedTechnologyAnswer,
          language: responseLanguage,
          ...languagePreference,
          citations: [],
          articleRecommendations: [],
          actions: createInsufficientContextActions(question),
          contexts: [],
        };
      }

      const answer = await this.answerProvider.generateInsufficientContextAnswer(
        question,
        messages,
        responseLanguage
      );

      return {
        answer: normalizeAssistantAnswer(answer),
        language: responseLanguage,
        ...languagePreference,
        citations: [],
        articleRecommendations: [],
        actions: createInsufficientContextActions(question),
        contexts: [],
      };
    }

    const answer = await this.answerProvider.generateAnswer(
      buildAnswerQuestion(question, retrievalResults),
      messages,
      contexts,
      responseLanguage
    );

    return createAnswerResult({
      answer,
      language: responseLanguage,
      languagePreference,
      question,
      contexts,
      retrievalResults,
      siteUrl: this.config.siteUrl,
      pageContext,
    });
  }

  private async rewritePreviousAnswer(
    question: string,
    messages: IChatMessage[],
    task: ConversationTransformTask,
    responseLanguage: string,
    languagePreference: Pick<IAskQuestionResult, 'languagePreference'>
  ): Promise<IAskQuestionResult> {
    const previousAnswer = getLatestAssistantAnswer(messages);

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

    const answer = await this.answerProvider.rewritePreviousAnswer(
      question,
      previousAnswer,
      task,
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
