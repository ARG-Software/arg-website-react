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
