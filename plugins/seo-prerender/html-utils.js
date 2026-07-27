import { SITE_URL } from './constants.js';
import { DEFAULT_AUTHOR } from '../../src/constants/seo.js';
import { renderJsonLdScripts } from '../../src/utils/structuredData.js';

export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function replaceOrInsertHeadTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', `  ${replacement}\n</head>`);
}

export function replaceMetaTags(
  html,
  {
    title,
    description,
    url,
    image,
    type = 'website',
    extra = '',
    jsonLd,
    includeGlobalJsonLd = true,
    includePageJsonLd = true,
    author = DEFAULT_AUTHOR.name,
    authorUrl = DEFAULT_AUTHOR.url,
  }
) {
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
    : `${SITE_URL}/images/og.jpg`;

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeAuthor = escapeHtml(author);
  const safeAuthorUrl = escapeHtml(
    authorUrl.startsWith('http')
      ? authorUrl
      : `${SITE_URL}${authorUrl.startsWith('/') ? '' : '/'}${authorUrl}`
  );

  let result = html;

  result = result.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);

  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${safeDesc}" />`
  );

  result = replaceOrInsertHeadTag(
    result,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(url)}" />`
  );
  result = replaceOrInsertHeadTag(
    result,
    /<meta\s+name="author"\s+content="[^"]*"\s*\/?>/,
    `<meta name="author" content="${safeAuthor}" />`
  );
  result = replaceOrInsertHeadTag(
    result,
    /<link\s+rel="author"\s+href="[^"]*"\s*\/?>/,
    `<link rel="author" href="${safeAuthorUrl}" />`
  );

  result = result.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${type}" />`
  );
  result = result.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  result = result.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  result = result.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(url)}" />`
  );
  result = result.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
  );
  result = result.replace(
    /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />`
  );

  result = result.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  result = result.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  result = result.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );

  if (extra) {
    result = result.replace('</head>', `  ${extra}\n</head>`);
  }

  result = injectStructuredData(result, jsonLd, {
    includeGlobal: includeGlobalJsonLd,
    page: includePageJsonLd
      ? {
          title,
          description,
          path: new URL(url).pathname,
          image,
        }
      : undefined,
  });

  return result;
}

export function injectStructuredData(html, jsonLd, options) {
  const scripts = renderJsonLdScripts(jsonLd, options);
  if (!scripts) return html;
  return html.replace('</head>', `  ${scripts}\n</head>`);
}
