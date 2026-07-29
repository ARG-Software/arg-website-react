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

export type RetrievalRouteKind =
  | 'blog'
  | 'careers'
  | 'commercial_delivery'
  | 'company_services'
  | 'direct_evidence'
  | 'editorial'
  | 'link_action'
  | 'open_source'
  | 'people'
  | 'portfolio_work'
  | 'technology_quality';

export type BlogRouteKind = 'answer' | 'latest' | 'topic_discovery';

export type CommercialDeliveryKind =
  | 'engagement_duration'
  | 'general_pricing'
  | 'project_budget'
  | 'project_duration'
  | 'timeline_estimate';

export type EmbeddingIndex = 'primary' | 'fallback';

export interface RetrievalRoute {
  kind: RetrievalRouteKind;
  firstPartySourceTypes: RagSourceType[] | null;
  entity: string;
  subject: string;
  sourceKeys?: string[];
  forceFirstChunks?: boolean;
  blogKind?: BlogRouteKind;
  commercialKind?: CommercialDeliveryKind;
  requiresPersonClarification?: boolean;
}
