import type { RetrievedContext } from '../../../domain/retrieval/RetrievedContext.js';
import type { Citation } from '../../../domain/assistant/AssistantResponse.js';
import type { PageContext } from '../../../domain/conversation/ChatMessage.js';
import { resolveUrl } from '../../../utils/url.js';

export function createCitations(
  contexts: RetrievedContext[],
  siteUrl: string,
  pageContext?: PageContext | null
): Citation[] {
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
  context: RetrievedContext,
  siteUrl: string,
  pageContext?: PageContext | null
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

function isNavigableFirstPartyContext(context: RetrievedContext, siteUrl: string): boolean {
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
