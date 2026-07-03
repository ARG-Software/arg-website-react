import fs from 'node:fs';
import path from 'node:path';
import { buildCrawlableBlock, injectCrawlableBlock } from '../crawlable-block.js';
import { injectStructuredData } from '../html-utils.js';
import { getHomepageExtraLinks } from '../links.js';
import { homepageFaqItems } from '../../../src/data/faq.js';
import { buildFAQPageSchema } from '../../../src/utils/structuredData.js';

export function writeHomepage({ distDir, baseHtml }) {
  const block = buildCrawlableBlock('Building digital solutions that grow with you', {
    description:
      'We build secure, scalable digital platforms for fintech, media, and high-growth tech companies. Architecture-first. Production-ready.',
    paragraphs: [
      'Arg Software is a custom software development company based in Funchal and Porto, Portugal. We design and build scalable backend systems, SaaS platforms, REST APIs, and cloud infrastructure for fintech, music technology, and high-growth tech companies worldwide.',
      'Our services include custom software development, MVP and prototype delivery, server infrastructure, backend architecture, frontend development, and AI integration. We specialize in TypeScript, .NET, Node.js, React, Angular, PostgreSQL, Kafka, Docker, and Kubernetes.',
      'We have delivered production systems across 6 countries handling 2000 transactions per second, with over 1000 deploys into production. Our clients include the Interledger Foundation, Mojaloop, SkyTracks, North Music Group, Dokutar, and TvCine.',
      'Arg Software works with startups, scale-ups, and established enterprises. We deliver focused MVPs in 6 to 16 weeks and build long-term partnerships to evolve products alongside your business.',
    ],
    extraLinks: getHomepageExtraLinks(),
  });

  const indexPath = path.join(distDir, 'index.html');
  const html = injectStructuredData(baseHtml, buildFAQPageSchema(homepageFaqItems));
  fs.writeFileSync(indexPath, injectCrawlableBlock(html, block));
}
