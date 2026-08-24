import type { IRetrievedContext } from '../../../domain/retrieval/IRetrievedContext.js';
import type { IAskQuestionResult } from '../../../domain/assistant/AssistantResponse.js';
import type { IPageContext } from '../../../domain/conversation/IChatMessage.js';
import type { IRetrievalItemResult } from '../planning/createRetrievalItems.js';
import { createAssistantActions } from './actions.js';
import { createCitations } from './citations.js';
import { normalizeAssistantAnswer } from './normalizeAnswer.js';
import {
  createArticleRecommendations,
  mergeArticleRecommendations,
} from './recommendations.js';

export function createAnswerResult({
  answer,
  language,
  languagePreference,
  question,
  contexts,
  retrievalResults,
  siteUrl,
  pageContext,
}: {
  answer: string;
  language: string;
  languagePreference?: Pick<IAskQuestionResult, 'languagePreference'>;
  question: string;
  contexts: IRetrievedContext[];
  retrievalResults: IRetrievalItemResult[];
  siteUrl: string;
  pageContext?: IPageContext | null;
}): IAskQuestionResult {
  return {
    answer: normalizeAssistantAnswer(answer),
    language,
    ...languagePreference,
    citations: createCitations(contexts, siteUrl, pageContext),
    articleRecommendations: mergeArticleRecommendations(
      retrievalResults.map(result =>
        createArticleRecommendations(result.contexts, result.route, siteUrl)
      )
    ),
    actions: createAssistantActions(question),
    contexts,
  };
}
