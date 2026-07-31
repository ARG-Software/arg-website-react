import type { RetrievedContext } from '../../../domain/retrieval/RetrievedContext.js';
import type { AskQuestionResult } from '../../../core/types/output.js';
import type { RetrievalItemResult } from '../planning/createRetrievalItems.js';
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
}: {
  answer: string;
  language: string;
  languagePreference?: Pick<AskQuestionResult, 'languagePreference'>;
  question: string;
  contexts: RetrievedContext[];
  retrievalResults: RetrievalItemResult[];
  siteUrl: string;
}): AskQuestionResult {
  return {
    answer: normalizeAssistantAnswer(answer),
    language,
    ...languagePreference,
    citations: createCitations(contexts, siteUrl),
    articleRecommendations: mergeArticleRecommendations(
      retrievalResults.map(result =>
        createArticleRecommendations(result.contexts, result.route, siteUrl)
      )
    ),
    actions: createAssistantActions(question),
    contexts,
  };
}
