import fs from 'node:fs';
import path from 'node:path';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { injectStructuredData } from '../html-utils.js';
import { getHomepageExtraLinks } from '../links.js';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../../../src/frontend/constants/seo.js';
import { buildFAQPageSchema, buildWebPageSchema } from '../../../src/frontend/utils/structuredData.js';

const FAQ = JSON.parse(
  fs.readFileSync(new URL('../../../src/frontend/data/faq.json', import.meta.url), 'utf8')
);

export function writeHomepage({ distDir, baseHtml }) {
  const block = buildCrawlableBlock('Building systems that endure as you scale', {
    description: DEFAULT_DESCRIPTION,
    paragraphs: [
      'ARG Software is an architecture-first software engineering company based in Portugal, Europe. Its senior-led team builds production-ready systems for fintech, SaaS and high-growth technology companies worldwide.',
      'ARG provides dedicated product teams, senior team extension, technical consulting, MVP and product delivery, AI integration, and cloud and platform engineering. Technology is selected for system requirements, team fit and long-term operability.',
      'ARG Software has worked on systems reaching more than 6 countries, Mojaloop load testing that verified more than 2,000 transactions per second, and more than 1,000 production deployments. Public work includes Interledger Foundation, Mojaloop, SkyTracks, North Music Group, Dokutar and TV Cine.',
      'ARG works with startups, scale-ups and established companies when the problem is complex, the stakes are real and the system has to last. Focused MVPs typically take 8 to 14 weeks and are designed to evolve beyond the first release.',
    ],
    extraLinks: getHomepageExtraLinks(),
  });

  const indexPath = path.join(distDir, 'index.html');
  const html = injectStructuredData(baseHtml, [
    buildWebPageSchema({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: '/',
    }),
    buildFAQPageSchema(FAQ.items),
  ]);
  fs.writeFileSync(indexPath, injectCrawlableBlock(html, block));
}
