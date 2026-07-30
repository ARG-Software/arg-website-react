import type { RetrievedContext } from '../../core/types/context.js';
import type { AskQuestionResult } from '../../core/types/output.js';
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
  question,
  contexts,
  retrievalResults,
  siteUrl,
}: {
  answer: string;
  language: string;
  question: string;
  contexts: RetrievedContext[];
  retrievalResults: RetrievalItemResult[];
  siteUrl: string;
}): AskQuestionResult {
  return {
    answer: normalizeAssistantAnswer(answer),
    language,
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
