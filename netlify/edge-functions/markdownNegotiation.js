const EXCLUDED_PATH_PREFIXES = [
  '/api/',
  '/mcp',
  '/.well-known/',
  '/assets/',
  '/images/',
  '/icons/',
  '/fonts/',
  '/videos/',
  '/files/',
  '/g/',
];

const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

export default async function markdownNegotiation(request, context) {
  if (!shouldReturnMarkdown(request)) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html, request.url);
  const headers = new Headers(response.headers);

  headers.set('content-type', MARKDOWN_CONTENT_TYPE);
  headers.set('vary', appendVary(headers.get('vary'), 'Accept'));
  headers.set('x-markdown-tokens', String(countApproximateTokens(markdown)));
  headers.delete('content-length');

  return new Response(markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function shouldReturnMarkdown(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (EXCLUDED_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) return false;

  return request.headers.get('accept')?.toLowerCase().includes('text/markdown') || false;
}

function htmlToMarkdown(html, requestUrl) {
  const title = getTitle(html);
  const baseUrl = new URL(requestUrl);
  const content = getBodyContent(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, label) => {
      const href = getAttribute(attrs, 'href');
      const text = cleanText(label);
      if (!href || !text) return text;
      return `[${text}](${toAbsoluteUrl(href, baseUrl)})`;
    })
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${cleanText(text)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${cleanText(text)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${cleanText(text)}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n#### ${cleanText(text)}\n\n`)
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n##### ${cleanText(text)}\n\n`)
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n###### ${cleanText(text)}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${cleanText(text)}`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|nav|main|aside|ul|ol|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  const markdown = normalizeMarkdown(decodeEntities(content));
  if (!title || markdown.startsWith('# ')) return markdown;

  return normalizeMarkdown(`# ${title}\n\n${markdown}`);
}

function getBodyContent(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function getTitle(html) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? cleanText(titleMatch[1]) : '';
}

function getAttribute(attrs, name) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function cleanText(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeMarkdown(value) {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function appendVary(value, headerName) {
  if (!value) return headerName;

  const existing = value.split(',').map(item => item.trim().toLowerCase());
  if (existing.includes(headerName.toLowerCase())) return value;

  return `${value}, ${headerName}`;
}

function countApproximateTokens(value) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.33));
}
