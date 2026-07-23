import type { RagSourceType } from './ingestion.js';

type RetrievedContextMetadata = Record<string, unknown>;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type QuestionIntent = 'small_talk' | 'rag_question' | 'unsupported';

export interface QuestionIntentResult {
  intent: QuestionIntent;
  response: string;
}

export interface RetrievedContext {
  chunkId: string;
  sourceId: string;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url: string | null;
  path: string | null;
  chunkIndex: number;
  content: string;
  similarity: number;
  sourceMetadata: RetrievedContextMetadata;
  chunkMetadata: RetrievedContextMetadata;
}

export interface Citation {
  title: string;
  url: string | null;
  sourceType: RagSourceType;
  sourceKey: string;
}

export interface AskQuestionResult {
  answer: string;
  citations: Citation[];
  contexts: RetrievedContext[];
}

export interface AnswerClient {
  classifyQuestionIntent(question: string, messages: ChatMessage[]): Promise<QuestionIntentResult>;
  rewriteQuestion(question: string, messages: ChatMessage[]): Promise<string>;
  generateAnswer(
    question: string,
    messages: ChatMessage[],
    contexts: RetrievedContext[]
  ): Promise<string>;
  generateInsufficientContextAnswer(question: string, messages: ChatMessage[]): Promise<string>;
  generateIntentFallbackResponse(
    question: string,
    intent: Exclude<QuestionIntent, 'rag_question'>
  ): Promise<string>;
}
