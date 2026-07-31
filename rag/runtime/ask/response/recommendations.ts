import type { RetrievedContext } from '../../../domain/retrieval/RetrievedContext.js';
import type { ArticleRecommendation } from '../../../domain/assistant/AssistantResponse.js';
import type { RetrievalRoute } from '../../../domain/retrieval/RetrievalRoute.js';
import { resolveUrl } from '../../../utils/url.js';

export function createArticleRecommendations(
  contexts: RetrievedContext[],
  route: RetrievalRoute,
  siteUrl: string
): ArticleRecommendation[] {
  if (route.kind !== 'blog' && !hasFirstPartyBlogContext(contexts)) {
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

    if (recommendations.length === (route.blogKind === 'latest' ? 3 : 2)) {
      break;
    }
  }

  return recommendations;
}

function hasFirstPartyBlogContext(contexts: RetrievedContext[]): boolean {
  return contexts.some(context => context.sourceType === 'blog_post' && context.origin === 'first_party');
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
