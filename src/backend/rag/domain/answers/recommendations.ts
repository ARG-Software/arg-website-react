import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../routing/retrievalroute.types.js';
import type { IArticleRecommendation } from './assistantanswer.types.js';

export function shouldRecommendArticles(
  contexts: IRetrievedContext[],
  route: IRetrievalRoute
): boolean {
  return (
    route.kind === 'blog' ||
    hasFirstPartyBlogContext(contexts) ||
    contexts.some(context => getPatternRelatedArticles(context).length > 0)
  );
}

// Pattern sources carry the articles listed in the pattern's relatedPosts.
export function getPatternRelatedArticles(context: IRetrievedContext): IArticleRecommendation[] {
  const relatedArticles = context.sourceMetadata.relatedArticles;
  if (!context.sourceKey.startsWith('pattern-') || !Array.isArray(relatedArticles)) {
    return [];
  }
  return relatedArticles as IArticleRecommendation[];
}

export function getArticleRecommendationLimit(route: IRetrievalRoute): number {
  return route.blogKind === 'latest' ? 3 : 2;
}

export function isArticleRecommendationContext(context: IRetrievedContext): boolean {
  return context.sourceType === 'blog_post' && context.origin === 'first_party';
}

function hasFirstPartyBlogContext(contexts: IRetrievedContext[]): boolean {
  return contexts.some(context => isArticleRecommendationContext(context));
}
