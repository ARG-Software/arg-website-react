import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBlocks } from '../../../src/frontend/utils/blog/articleContent.js';
import {
  buildBlogPostStaticContent,
  buildProjectStaticContent,
  injectStaticContent,
} from '../../../plugins/seo-prerender/static-content.js';

test('renders complete blog content inside the React root', () => {
  const blocks = parseBlocks(
    `Intro with [\`ARG\`](https://arg.software), **strong \`defaults\`**, and \`inline code\`.\n\n## Architecture\n\n- **Use \`Result\`.** Safe by default\n- Production ready\n\n\`\`\`js\nconst safe = true;\n\`\`\``
  );
  const content = buildBlogPostStaticContent(
    {
      title: 'Engineering article',
      slug: 'engineering-article',
      author: 'ARG',
      authorUrl: 'https://www.linkedin.com/company/arg-software',
      reviewedOn: 'September 17, 2026',
    },
    blocks
  );
  const html = injectStaticContent('<body><div id="root"></div></body>', content);

  assert.match(html, /<div id="root"><div class="page-wrapper" data-prerendered-content>/);
  assert.match(html, /<h2 id="architecture"/);
  assert.match(html, /Safe by default/);
  assert.match(html, /const safe = true;/);
  assert.match(html, /href="https:\/\/arg\.software"/);
  assert.match(
    html,
    /<a href="https:\/\/arg\.software"[^>]*><code class="inline-markdown-code">ARG<\/code><\/a>/
  );
  assert.match(
    html,
    /<strong>strong <code class="inline-markdown-code">defaults<\/code><\/strong>/
  );
  assert.match(
    html,
    /<span class="bp-list-label">Use <code class="inline-markdown-code">Result<\/code>\.<\/span>/
  );
  assert.match(html, /<code class="inline-markdown-code">inline code<\/code>/);
  assert.match(html, /Reviewed on September 17, 2026/);
  assert.match(
    html,
    /<a href="https:\/\/www\.linkedin\.com\/company\/arg-software" rel="author noopener noreferrer">ARG<\/a>/
  );
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test('renders a blank-separated ordered list as one ol', () => {
  const blocks = parseBlocks('1. First\n\n1. Second\n\n1. Third');
  const content = buildBlogPostStaticContent(
    {
      title: 'Engineering article',
      slug: 'engineering-article',
      author: 'ARG',
    },
    blocks
  );

  assert.equal((content.match(/<ol class="bp-list bp-list--ordered">/g) || []).length, 1);
  assert.equal((content.match(/<li class="bp-list-item">/g) || []).length, 3);
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
