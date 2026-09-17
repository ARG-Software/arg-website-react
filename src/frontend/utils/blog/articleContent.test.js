import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBlocks } from './articleContent.js';
import { parseInlineMarkdown } from '../inlineMarkdown.js';

test('parses links, bold text, and inline code without raw HTML', () => {
  assert.deepEqual(
    parseInlineMarkdown('Read **carefully**, run `npm test`, then visit [ARG](/about-us/).'),
    [
      { type: 'text', text: 'Read ' },
      { type: 'strong', parts: [{ type: 'text', text: 'carefully' }] },
      { type: 'text', text: ', run ' },
      { type: 'code', text: 'npm test' },
      { type: 'text', text: ', then visit ' },
      {
        type: 'link',
        parts: [{ type: 'text', text: 'ARG' }],
        href: '/about-us/',
      },
      { type: 'text', text: '.' },
    ]
  );
});

test('parses nested code inside links and strong text', () => {
  assert.deepEqual(parseInlineMarkdown('[`activeTab`](/docs) and **Use `Result`.**'), [
    {
      type: 'link',
      parts: [{ type: 'code', text: 'activeTab' }],
      href: '/docs',
    },
    { type: 'text', text: ' and ' },
    {
      type: 'strong',
      parts: [
        { type: 'text', text: 'Use ' },
        { type: 'code', text: 'Result' },
        { type: 'text', text: '.' },
      ],
    },
  ]);
});

test('leaves unsafe inline links as literal text', () => {
  assert.deepEqual(parseInlineMarkdown('[click](javascript:alert)'), [
    { type: 'text', text: '[click](javascript:alert)' },
  ]);
});

test('keeps a single numbered line as an ordered list', () => {
  assert.deepEqual(parseBlocks('1. First migration step'), [
    {
      type: 'ordered-list',
      items: [{ label: '', text: 'First migration step' }],
    },
  ]);
});
