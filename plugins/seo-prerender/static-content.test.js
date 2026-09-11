import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBlocks } from '../../src/frontend/utils/blog/articleContent.js';
import {
  buildBlogPostStaticContent,
  buildProjectStaticContent,
  injectStaticContent,
} from './static-content.js';

test('renders complete blog content inside the React root', () => {
  const blocks = parseBlocks(
    `Intro with [ARG](https://arg.software).\n\n## Architecture\n\n- Safe by default\n- Production ready\n\n\`\`\`js\nconst safe = true;\n\`\`\``
  );
  const content = buildBlogPostStaticContent(
    { title: 'Engineering article', slug: 'engineering-article', author: 'ARG' },
    blocks
  );
  const html = injectStaticContent('<body><div id="root"></div></body>', content);

  assert.match(html, /<div id="root"><div class="page-wrapper" data-prerendered-content>/);
  assert.match(html, /<h2 id="architecture"/);
  assert.match(html, /Safe by default/);
  assert.match(html, /const safe = true;/);
  assert.match(html, /href="https:\/\/arg\.software"/);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test('renders complete project evidence inside semantic sections', () => {
  const content = buildProjectStaticContent({
    title: 'Payment Platform',
    intro: 'A payment platform.',
    description: 'Built with [Partner](https://example.com/).',
    subtitle: 'Fintech',
    client: 'Example Client',
    timeline: 'Two years',
    services: ['Architecture', 'Backend'],
    stack: 'Node, Kafka',
    challenge: 'First challenge.\n\nFinal challenge evidence.',
    solution: ['Designed the switch', 'Tested settlement'],
    impact: 'Processed production payments.',
    metrics: [
      { value: '2000', suffix: '+', label: 'Transactions per second' },
      { value: '770', displayValue: '770 ms', label: 'Average transfer time' },
    ],
  });

  assert.match(content, /<main>/);
  assert.match(content, /Final challenge evidence\./);
  assert.match(content, /Tested settlement/);
  assert.match(content, /Processed production payments\./);
  assert.match(content, /Featured engagement<\/dt><dd>Two years/);
  assert.match(content, /2000\+/);
  assert.match(content, /770 ms/);
  assert.match(content, /Transactions per second/);
});
