import type { ChatMessage, PageContext } from './chat.js';
import type { AssistantUiCopy } from './assistantUiCopy.js';
import type { RetrievedContext } from './context.js';
import type {
  ConversationTransformTask,
  FallbackQuestionIntent,
  QuestionIntentResult,
  RetrievalPlan,
} from './retrieval.js';

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface AnswerProvider {
  classifyQuestionIntent(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<QuestionIntentResult>;
  planRetrieval(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<RetrievalPlan>;
  generateAnswer(
    question: string,
    messages: ChatMessage[],
    contexts: RetrievedContext[],
    responseLanguage: string
  ): Promise<string>;
  generateInsufficientContextAnswer(
    question: string,
    messages: ChatMessage[],
    responseLanguage: string
  ): Promise<string>;
  generateIntentFallbackResponse(
    question: string,
    intent: FallbackQuestionIntent,
    responseLanguage: string
  ): Promise<string>;
  rewritePreviousAnswer(
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask,
    responseLanguage: string
  ): Promise<string>;
}

export interface AssistantUiCopyTranslator {
  translateAssistantUiCopy(
    source: AssistantUiCopy,
    language: string
  ): Promise<Partial<AssistantUiCopy>>;
}
