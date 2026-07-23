import type { RagSourceMetadata, RagSourceType } from './source.js';

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptMessage {
  role: 'system' | ChatMessage['role'];
  content: string;
}

export interface PageContext {
  pathname: string;
  title: string;
  projectSlug?: string;
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
  sourceMetadata: RagSourceMetadata;
  chunkMetadata: RagSourceMetadata;
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

export interface AnswerProvider {
  classifyQuestionIntent(question: string, messages: ChatMessage[]): Promise<QuestionIntentResult>;
  rewriteQuestion(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<string>;
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
