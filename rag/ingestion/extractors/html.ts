import { normalizeText } from '../processing/text.js';

const MAX_EXTERNAL_HTML_BYTES = 2 * 1024 * 1024;

export async function fetchExternalHtml(
  url: string,
  allowedHostname: string
): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; ARGSoftwareRAG/1.0; +https://arg.software)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch external source ${url}: ${response.status}`);
  }

  const finalUrl = new URL(response.url);

  if (finalUrl.hostname !== allowedHostname) {
    throw new Error(`External source redirected to an unapproved host: ${finalUrl.hostname}`);
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);

  if (contentLength > MAX_EXTERNAL_HTML_BYTES) {
    throw new Error(`External source exceeds the ${MAX_EXTERNAL_HTML_BYTES} byte limit`);
  }

  const html = await response.text();

  if (Buffer.byteLength(html, 'utf8') > MAX_EXTERNAL_HTML_BYTES) {
    throw new Error(`External source exceeds the ${MAX_EXTERNAL_HTML_BYTES} byte limit`);
  }

  return { html, finalUrl: finalUrl.toString() };
}

export async function extractHtmlText(html: string): Promise<string> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);

  $('script, style, noscript, svg, canvas, iframe').remove();

  const title = normalizeText($('title').first().text());
  const description = normalizeText($('meta[name="description"]').attr('content'));
  const body = normalizeText($('body').text());

  return normalizeText([title, description, body].filter(Boolean).join('\n\n'));
}
