import { normalizeText } from '../processing/text.js';

export async function fetchExternalHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; ARGSoftwareRAG/1.0; +https://arg.software)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch external source ${url}: ${response.status}`);
  }

  return response.text();
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
