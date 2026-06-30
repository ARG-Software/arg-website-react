import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, STATIC_PAGES } from '../constants.js';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { replaceMetaTags } from '../html-utils.js';

export function writeStaticPages({ distDir, baseHtml, blogPostLinks, generated }) {
  let count = generated;
  for (const page of STATIC_PAGES) {
    let html = replaceMetaTags(baseHtml, {
      title: page.title,
      description: page.description,
      url: `${SITE_URL}${page.path}`,
      type: 'website',
    });
    const extraLinks = page.path === '/blog/' ? blogPostLinks : [];
    html = injectCrawlableBlock(
      html,
      buildCrawlableBlock(page.h1, {
        description: page.description,
        paragraphs: page.paragraphs || [],
        extraLinks,
      })
    );

    const dir = path.join(distDir, page.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
