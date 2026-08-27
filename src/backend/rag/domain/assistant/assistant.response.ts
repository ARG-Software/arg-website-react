import type { RagSourceType } from '../content/iragsource.js';
import type { IRetrievedContext } from '../retrieval/iretrievedcontext.js';
import type { IAssistantAction } from './iassistantaction.js';

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
