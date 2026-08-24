import type { RagSourceType } from '../content/IRagSource.js';
import type { IRetrievedContext } from '../retrieval/IRetrievedContext.js';
import type { IAssistantAction } from './IAssistantAction.js';

export interface ICitation {
  title: string;
  url: string | null;
  sourceType: RagSourceType;
  sourceKey: string;
}

export interface IArticleRecommendation {
  title: string;
  url: string;
}

export interface IAskQuestionResult {
  answer: string;
  language: string;
  languagePreference?: {
    action: 'set' | 'clear';
    language?: string;
  };
  citations: ICitation[];
  articleRecommendations: IArticleRecommendation[];
  actions: IAssistantAction[];
  contexts: IRetrievedContext[];
}
