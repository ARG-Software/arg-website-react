export type RetrievalMode = 'direct_evidence' | 'editorial' | 'article_discovery';

export interface IRetrievalQuestionPlan {
  query: string;
  mode: RetrievalMode;
  entity: string;
  subject: string;
}

export interface IRetrievalPlan extends IRetrievalQuestionPlan {
  questions?: IRetrievalQuestionPlan[];
}
