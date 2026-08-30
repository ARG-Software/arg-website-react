import type { IAssistantUiCopy } from '../../domain/assistant/assistantcopy.types.js';
import type { IChatMessage } from '../../domain/conversation/chatmessage.types.js';
import type { IPageContext } from '../../domain/conversation/pagecontext.types.js';
import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { ConversationTransformTask } from '../../domain/conversation/conversationtransform.types.js';
import type {
  FallbackQuestionIntent,
  IQuestionIntentResult,
} from '../../domain/conversation/questionintent.types.js';
import type { IRetrievalPlan } from '../../domain/routing/retrievalplan.types.js';

export interface IEmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface ILlmProvider {
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
  translateAssistantUiCopy(
    source: IAssistantUiCopy,
    language: string
  ): Promise<Partial<IAssistantUiCopy>>;
}
