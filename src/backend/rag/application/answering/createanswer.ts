import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { IAskQuestionResult } from '../../domain/answers/assistantanswer.types.js';
import type { IPageContext } from '../../domain/conversation/pagecontext.types.js';
import type { IRetrievalItemResult } from '../../domain/routing/retrievalitems.js';
import { createAssistantActions } from '../../domain/assistant/actions.js';
import { normalizeAssistantAnswer } from '../../domain/answers/answerpolicy.js';
import { createCitations } from './citations.js';
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
