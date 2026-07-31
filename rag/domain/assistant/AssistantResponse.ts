import type { RagSourceType } from '../content/RagSource.js';
import type { RetrievedContext } from '../retrieval/RetrievedContext.js';
import type { AssistantAction } from './AssistantAction.js';

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
