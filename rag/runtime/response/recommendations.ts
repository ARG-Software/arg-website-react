import type { RetrievedContext } from '../../core/types/context.js';
import type { ArticleRecommendation } from '../../core/types/output.js';
import type { RetrievalRoute } from '../../core/types/retrieval.js';
import { resolveUrl } from '../../utils/url.js';

export function createArticleRecommendations(
  contexts: RetrievedContext[],
  route: RetrievalRoute,
  siteUrl: string
): ArticleRecommendation[] {
  if (route.kind !== 'editorial' && route.kind !== 'latest_blog') {
    return [];
  }

  const recommendations: ArticleRecommendation[] = [];
  const seenUrls = new Set<string>();

  for (const context of contexts) {
    if (context.sourceType !== 'blog_post' || context.origin !== 'first_party') {
      continue;
    }

    const url = resolveUrl(context.url ?? `/blog/${context.sourceKey}/`, siteUrl);

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    recommendations.push({ title: context.title, url });

    if (recommendations.length === (route.kind === 'latest_blog' ? 3 : 2)) {
      break;
    }
  }

  return recommendations;
}

export function mergeArticleRecommendations(
  recommendationGroups: ArticleRecommendation[][]
): ArticleRecommendation[] {
  const seenUrls = new Set<string>();
  return recommendationGroups.flat().filter(recommendation => {
    if (seenUrls.has(recommendation.url)) {
      return false;
    }

    seenUrls.add(recommendation.url);
    return true;
  });
}
