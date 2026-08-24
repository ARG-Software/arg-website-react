import type { IAssistantUiCopy } from '../../domain/assistant/IAssistantUiCopy.js';
import type { IChatMessage, IPageContext } from '../../domain/conversation/IChatMessage.js';
import type { IRetrievedContext } from '../../domain/retrieval/IRetrievedContext.js';
import type { ConversationTransformTask } from '../../domain/conversation/ConversationTransform.js';
import type {
  FallbackQuestionIntent,
  IQuestionIntentResult,
} from '../../domain/conversation/QuestionIntent.js';
import type { IRetrievalPlan } from '../../domain/retrieval/IRetrievalPlan.js';

export interface IEmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface IAnswerProvider {
  classifyQuestionIntent(
    question: string,
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IQuestionIntentResult>;
  planRetrieval(
    question: string,
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IRetrievalPlan>;
  generateAnswer(
    question: string,
    messages: IChatMessage[],
    contexts: IRetrievedContext[],
    responseLanguage: string
  ): Promise<string>;
  generateInsufficientContextAnswer(
    question: string,
    messages: IChatMessage[],
    responseLanguage: string
  ): Promise<string>;
  generateIntentFallbackResponse(
    question: string,
    intent: FallbackQuestionIntent,
    responseLanguage: string
  ): Promise<string>;
  generatePersonClarification(question: string, responseLanguage: string): Promise<string>;
  rewritePreviousAnswer(
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask,
    responseLanguage: string
  ): Promise<string>;
}

export interface IAssistantUiCopyTranslator {
  translateAssistantUiCopy(
    source: IAssistantUiCopy,
    language: string
  ): Promise<Partial<IAssistantUiCopy>>;
}
