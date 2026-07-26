import type { RagSourceType } from './source.js';

export type QuestionIntent = 'small_talk' | 'rag_question' | 'unsupported';

export interface QuestionIntentResult {
  intent: QuestionIntent;
  response: string;
  language: string;
}

export type RetrievalMode = 'direct_evidence' | 'editorial' | 'article_discovery';

export interface RetrievalQuestionPlan {
  query: string;
  mode: RetrievalMode;
  entity: string;
  subject: string;
}

export interface RetrievalPlan extends RetrievalQuestionPlan {
  questions?: RetrievalQuestionPlan[];
}

export type RetrievalRouteKind = 'latest_blog' | 'direct_evidence' | 'editorial';

export interface RetrievalRoute {
  kind: RetrievalRouteKind;
  firstPartySourceTypes: RagSourceType[] | null;
  entity: string;
  subject: string;
  requiresPersonClarification?: boolean;
}
