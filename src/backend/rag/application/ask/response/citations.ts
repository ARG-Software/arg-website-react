import type { IRetrievedContext } from '../../../domain/retrieval/iretrievedcontext.js';
import type { ICitation } from '../../../domain/assistant/assistant.response.js';
import type { IPageContext } from '../../../domain/conversation/ichatmessage.js';
import { resolveUrl } from '../../common/url.js';

export function createCitations(
  contexts: IRetrievedContext[],
  siteUrl: string,
  pageContext?: IPageContext | null
): ICitation[] {
  if (
    contexts.some(
      context => context.origin === 'trusted_external' || context.sourceKey === 'assistant-policy'
    )
  ) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  for (const context of contexts) {
    if (!isNavigableFirstPartyContext(context, siteUrl)) {
      continue;
    }

    if (isCurrentPageContext(context, siteUrl, pageContext)) {
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

function isCurrentPageContext(
  context: IRetrievedContext,
  siteUrl: string,
  pageContext?: IPageContext | null
): boolean {
  if (!pageContext?.pathname || !context.url) {
    return false;
  }

  const contextPath = getComparablePath(context.url, siteUrl);
  const currentPath = getComparablePath(pageContext.pathname, siteUrl);

  return Boolean(contextPath && currentPath && contextPath === currentPath);
}

function getComparablePath(url: string, siteUrl: string): string | null {
  try {
    const pathname = new URL(url, siteUrl).pathname.replace(/\/+$/, '');
    return pathname || '/';
  } catch {
    return null;
  }
}

function isNavigableFirstPartyContext(context: IRetrievedContext, siteUrl: string): boolean {
  if (context.origin !== 'first_party' || !context.url) {
    return false;
  }

  if (context.sourceKey === 'assistant-profile') {
    return false;
  }

  if (
    context.sourceType === 'local_document' &&
    context.sourceMetadata?.documentKind !== 'portfolio'
  ) {
    return false;
  }

  try {
    return new URL(context.url).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
