import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { ICitation } from '../../domain/answers/assistantanswer.types.js';
import type { IPageContext } from '../../domain/conversation/pagecontext.types.js';
import { canExposeCitations, isCitationContext } from '../../domain/answers/citations.js';
import { resolveUrl } from '../shared/url.js';

export function createCitations(
  contexts: IRetrievedContext[],
  siteUrl: string,
  pageContext?: IPageContext | null
): ICitation[] {
  if (!canExposeCitations(contexts)) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  for (const context of contexts) {
    if (!isCitationContext(context, siteUrl, pageContext)) {
      continue;
    }

    const key = context.url || `${context.sourceType}:${context.sourceKey}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      title: context.title,
      url: context.url ?? resolveUrl(context.path, siteUrl),
      sourceType: context.sourceType,
      sourceKey: context.sourceKey,
    });

    break;
  }

  return citations;
}
