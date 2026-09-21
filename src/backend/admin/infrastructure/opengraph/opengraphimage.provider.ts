import type { IOpenGraphImageProvider } from '../../application/ports/iopengraphimage.provider.js';

const ARTICLE_URL_PATTERN = /https?:\/\/[^\s<>)"']+/gi;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 512_000;
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export class OpenGraphImageProvider implements IOpenGraphImageProvider {
  async fetchCoverFromText(text: string): Promise<string | null> {
    const pageUrl = firstArticleUrl(text);
    if (!pageUrl) return null;

    try {
      const response = await fetch(pageUrl, {
        headers: {
          Accept: 'text/html',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const html = (await response.text()).slice(0, MAX_HTML_BYTES);
      const imageUrl = readMetaContent(html, 'og:image') || readMetaContent(html, 'twitter:image');
      if (!imageUrl) return null;

      const resolved = new URL(imageUrl, pageUrl);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
      if (isBlockedHost(resolved.hostname)) return null;

      return resolved.toString();
    } catch {
      return null;
    }
  }
}

function firstArticleUrl(text: string): string | null {
  const matches = String(text || '').match(ARTICLE_URL_PATTERN) || [];

  for (const match of matches) {
    try {
      const url = new URL(match.replace(/[.,;]+$/, ''));
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      if (isBlockedHost(url.hostname) || isLinkedInHost(url.hostname)) continue;
      return url.toString();
    } catch {
      continue;
    }
  }

  return null;
}

function readMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function isLinkedInHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return host === 'linkedin.com' || host.endsWith('.linkedin.com');
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}
