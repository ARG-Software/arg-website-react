import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, NAV_LINKS } from '../constants.js';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { replaceMetaTags } from '../html-utils.js';

export function writeNotFoundPage({ distDir, baseHtml, generated }) {
  let html = replaceMetaTags(baseHtml, {
    title: 'Page Not Found | Arg Software',
    description: "The page you're looking for doesn't exist. Head back to Arg Software's homepage.",
    url: `${SITE_URL}/`,
    type: 'website',
  });

  html = html.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="noindex, nofollow" />'
  );

  const block = buildCrawlableBlock('Page not found', {
    description:
      "The page you're looking for has moved, been deleted, or never existed. Let's get you back on track.",
    extraLinks: NAV_LINKS,
  });

  fs.writeFileSync(path.join(distDir, '404.html'), injectCrawlableBlock(html, block));
  return generated + 1;
}
