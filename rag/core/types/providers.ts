import type { ChatMessage, PageContext } from './chat.js';
import type { RetrievedContext } from './context.js';
import type { QuestionIntent, QuestionIntentResult, RetrievalPlan } from './retrieval.js';

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
    intent: Exclude<QuestionIntent, 'rag_question'>,
    responseLanguage: string
  ): Promise<string>;
}
