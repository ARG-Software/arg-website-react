import { SITE_URL } from '@constants/seo';
import { trackAssistantEvent } from '@services/analytics';

export function getInternalAssistantPath(url) {
  if (!url) return null;

  try {
    const currentOrigin = typeof window === 'undefined' ? SITE_URL : window.location.origin;
    const siteOrigin = new URL(SITE_URL).origin;
    const destination = new URL(url, currentOrigin);

    if (destination.origin !== currentOrigin && destination.origin !== siteOrigin) {
      return null;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export function getAssistantLinks(message) {
  const links = [];
  const seen = new Set();

  for (const article of message.articleRecommendations || []) {
    addAssistantLink(links, seen, {
      type: 'article',
      title: article.title,
      url: article.url,
    });
  }

  for (const citation of message.citations || []) {
    addAssistantLink(links, seen, {
      type: 'citation',
      title: citation.title,
      url: citation.url,
      sourceType: citation.sourceType,
      sourceKey: citation.sourceKey,
    });
  }

  return links;
}

function addAssistantLink(links, seen, link) {
  const key = `${link.url || ''}:${link.title || ''}`.toLowerCase();

  if (!link.title || seen.has(key)) {
    return;
  }

  seen.add(key);
  links.push(link);
}

export function trackAssistantLinkClick(link) {
  if (link.type === 'article') {
    trackAssistantEvent('article_recommendation_click', {
      article_title: link.title,
    });
    return;
  }

  trackAssistantEvent('citation_click', {
    source_type: link.sourceType,
    source_key: link.sourceKey,
  });
}
