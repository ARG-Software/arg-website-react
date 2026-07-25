import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from './source.js';
import type { HomepageSectionId } from '../config/homepageSections.js';

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
  activeSection?: HomepageSectionId;
}

export type QuestionIntent = 'small_talk' | 'rag_question' | 'unsupported';

export type RetrievalMode = 'direct_evidence' | 'editorial' | 'article_discovery';

export interface RetrievalPlan {
  query: string;
  mode: RetrievalMode;
  entity: string;
  subject: string;
}

export interface QuestionIntentResult {
  intent: QuestionIntent;
  response: string;
  language: string;
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
  origin: RagSourceOrigin;
}

export interface Citation {
  title: string;
  url: string | null;
  sourceType: RagSourceType;
  sourceKey: string;
}

export type AssistantActionType = 'book_meeting' | 'email_hello' | 'email_hr';

export interface AssistantAction {
  type: AssistantActionType;
}

export interface ArticleRecommendation {
  title: string;
  url: string;
}

export interface AskQuestionResult {
  answer: string;
  citations: Citation[];
  articleRecommendations: ArticleRecommendation[];
  actions: AssistantAction[];
  contexts: RetrievedContext[];
}

export interface AnswerProvider {
  classifyQuestionIntent(question: string, messages: ChatMessage[]): Promise<QuestionIntentResult>;
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
