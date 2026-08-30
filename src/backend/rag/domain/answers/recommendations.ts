import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../routing/retrievalroute.types.js';

export function shouldRecommendArticles(
  contexts: IRetrievedContext[],
  route: IRetrievalRoute
): boolean {
  return route.kind === 'blog' || hasFirstPartyBlogContext(contexts);
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
