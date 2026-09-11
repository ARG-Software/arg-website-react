import fs from 'node:fs';
import path from 'node:path';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { injectStructuredData } from '../html-utils.js';
import { getHomepageExtraLinks } from '../links.js';
import { DEFAULT_TITLE } from '../../../src/frontend/constants/seo.js';
import { buildFAQPageSchema, buildWebPageSchema } from '../../../src/frontend/utils/structuredData.js';

const FAQ = JSON.parse(
  fs.readFileSync(new URL('../../../src/frontend/data/faq.json', import.meta.url), 'utf8')
);

export function writeHomepage({ distDir, baseHtml }) {
  const block = buildCrawlableBlock('Building digital solutions that grow with you', {
    description:
      'We build secure, scalable digital platforms for fintech, media, and high-growth tech companies. Architecture-first. Production-ready.',
    paragraphs: [
      'ARG Software is a custom software development company based in Funchal and Porto, Portugal. We design and build scalable backend systems, SaaS platforms, REST APIs, and cloud infrastructure for fintech, music technology, and high-growth tech companies worldwide.',
      'Our services include custom software development, MVP and prototype delivery, server infrastructure, backend architecture, frontend development, and AI integration. We specialize in TypeScript, .NET, Node.js, React, Angular, PostgreSQL, Kafka, Docker, and Kubernetes.',
      'Our work includes platforms reaching more than 6 countries, Mojaloop load testing that verified over 2,000 transactions per second, and more than 1,000 production deployments. Our clients include the Interledger Foundation, Mojaloop, SkyTracks, North Music Group, Dokutar, and TV Cine.',
      'ARG Software works with startups, scale-ups, and established enterprises. We typically deliver focused MVPs in 8 to 14 weeks and build long-term partnerships to evolve products alongside your business.',
    ],
    extraLinks: getHomepageExtraLinks(),
  });

  const indexPath = path.join(distDir, 'index.html');
  const html = injectStructuredData(baseHtml, [
    buildWebPageSchema({
      title: DEFAULT_TITLE,
      description:
        'We build secure, scalable digital platforms for fintech, media, and high-growth tech companies. Architecture-first. Production-ready.',
      path: '/',
    }),
    buildFAQPageSchema(FAQ.items),
  ]);
  fs.writeFileSync(indexPath, injectCrawlableBlock(html, block));
}
