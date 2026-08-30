import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { IArticleRecommendation } from '../../domain/answers/assistantanswer.types.js';
import type { IRetrievalRoute } from '../../domain/routing/retrievalroute.types.js';
import {
  getArticleRecommendationLimit,
  isArticleRecommendationContext,
  shouldRecommendArticles,
} from '../../domain/answers/recommendations.js';
import { resolveUrl } from '../shared/url.js';

export function createArticleRecommendations(
  contexts: IRetrievedContext[],
  route: IRetrievalRoute,
  siteUrl: string
): IArticleRecommendation[] {
  if (!shouldRecommendArticles(contexts, route)) {
    return [];
  }

  const recommendations: IArticleRecommendation[] = [];
  const seenUrls = new Set<string>();

  for (const context of contexts) {
    if (!isArticleRecommendationContext(context)) {
      continue;
    }

    const url = resolveUrl(context.url ?? `/blog/${context.sourceKey}/`, siteUrl);

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    recommendations.push({ title: context.title, url });

    if (recommendations.length === getArticleRecommendationLimit(route)) {
      break;
    }
  }

  return recommendations;
}

export function mergeArticleRecommendations(
  recommendationGroups: IArticleRecommendation[][]
): IArticleRecommendation[] {
  const seenUrls = new Set<string>();
  return recommendationGroups.flat().filter(recommendation => {
    if (seenUrls.has(recommendation.url)) {
      return false;
    }

    seenUrls.add(recommendation.url);
    return true;
  });
}
