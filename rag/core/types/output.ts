import type { AssistantAction } from './actions.js';
import type { RetrievedContext } from './context.js';
import type { RagSourceType } from './source.js';

export interface Citation {
  title: string;
  url: string | null;
  sourceType: RagSourceType;
  sourceKey: string;
}

export interface ArticleRecommendation {
  title: string;
  url: string;
}

export interface AskQuestionResult {
  answer: string;
  language: string;
  citations: Citation[];
  articleRecommendations: ArticleRecommendation[];
  actions: AssistantAction[];
  contexts: RetrievedContext[];
}
