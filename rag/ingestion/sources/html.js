import { normalizeText } from '../processing/text.js';

export async function extractHtmlText(html) {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);

  $('script, style, noscript, svg, canvas, iframe').remove();

  const title = normalizeText($('title').first().text());
  const description = normalizeText($('meta[name="description"]').attr('content'));
  const body = normalizeText($('body').text());

  return normalizeText([title, description, body].filter(Boolean).join('\n\n'));
}

export async function loadExternalHtmlSource({ url, title, trusted = true }) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; ARGSoftwareRAG/1.0; +https://arg.software)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch external source ${url}: ${response.status}`);
  }

  const html = await response.text();
  const content = await extractHtmlText(html);
  const parsedUrl = new URL(url);

  return {
    sourceType: 'external_page',
    sourceKey: url,
    title: title ?? parsedUrl.hostname,
    url,
    metadata: {
      domain: parsedUrl.hostname,
      trusted,
    },
    content,
  };
}
