import type { RetrievedContext } from '../../core/types/context.js';
import type { Citation } from '../../core/types/output.js';
import { resolveUrl } from '../../utils/url.js';

export function createCitations(contexts: RetrievedContext[], siteUrl: string): Citation[] {
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

function isNavigableFirstPartyContext(context: RetrievedContext, siteUrl: string): boolean {
  if (context.origin !== 'first_party' || context.sourceType === 'local_document' || !context.url) {
    return false;
  }

  try {
    return new URL(context.url).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
