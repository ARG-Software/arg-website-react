import type { IPageContext } from '../conversation/pagecontext.types.js';
import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';

export function canExposeCitations(contexts: IRetrievedContext[]): boolean {
  return !contexts.some(
    context => context.origin === 'trusted_external' || context.sourceKey === 'assistant-policy'
  );
}

export function isCitationContext(
  context: IRetrievedContext,
  siteUrl: string,
  pageContext?: IPageContext | null
): boolean {
  return (
    isNavigableFirstPartyContext(context, siteUrl) &&
    !isCurrentPageContext(context, siteUrl, pageContext)
  );
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
