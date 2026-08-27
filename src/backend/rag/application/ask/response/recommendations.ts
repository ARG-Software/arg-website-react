import type { IRetrievedContext } from '../../../domain/retrieval/iretrievedcontext.js';
import type { IArticleRecommendation } from '../../../domain/assistant/assistant.response.js';
import type { IRetrievalRoute } from '../../../domain/retrieval/iretrievalroute.js';
import { resolveUrl } from '../../common/url.js';

export function createArticleRecommendations(
  contexts: IRetrievedContext[],
  route: IRetrievalRoute,
  siteUrl: string
): IArticleRecommendation[] {
  if (route.kind !== 'blog' && !hasFirstPartyBlogContext(contexts)) {
    return [];
  }

  const recommendations: IArticleRecommendation[] = [];
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

    if (recommendations.length === (route.blogKind === 'latest' ? 3 : 2)) {
      break;
    }
  }

  return recommendations;
}

function hasFirstPartyBlogContext(contexts: IRetrievedContext[]): boolean {
  return contexts.some(context => context.sourceType === 'blog_post' && context.origin === 'first_party');
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
