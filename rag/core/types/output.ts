import type { AssistantAction } from './actions.js';
import type { RagSourceType } from '../../domain/content/RagSource.js';
import type { RetrievedContext } from '../../domain/retrieval/RetrievedContext.js';

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
  languagePreference?: {
    action: 'set' | 'clear';
    language?: string;
  };
  citations: Citation[];
  articleRecommendations: ArticleRecommendation[];
  actions: AssistantAction[];
  contexts: RetrievedContext[];
}
