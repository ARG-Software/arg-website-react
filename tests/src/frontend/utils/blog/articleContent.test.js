import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBlocks } from '../../../../../src/frontend/utils/blog/articleContent.js';
import { parseInlineMarkdown } from '../../../../../src/frontend/utils/inlineMarkdown.js';

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

test('treats unlabeled fences as plaintext', () => {
  assert.deepEqual(parseBlocks('```\nselect 1\n```'), [
    { type: 'code', lang: 'plaintext', text: 'select 1' },
  ]);
});

test('keeps explicit fence languages', () => {
  assert.deepEqual(parseBlocks('```json\n{"ok":true}\n```\n\n```sql\nSELECT 1;\n```'), [
    { type: 'code', lang: 'json', text: '{"ok":true}' },
    { type: 'code', lang: 'sql', text: 'SELECT 1;' },
  ]);
});

test('coalesces blank-separated ordered list items', () => {
  assert.deepEqual(
    parseBlocks('1. First\n\n1. Second\n\n1. Third'),
    [
      {
        type: 'ordered-list',
        items: [
          { label: '', text: 'First' },
          { label: '', text: 'Second' },
          { label: '', text: 'Third' },
        ],
      },
    ]
  );
});

test('coalesces blank-separated unordered list items', () => {
  assert.deepEqual(parseBlocks('- First\n\n- Second'), [
    {
      type: 'list',
      items: [
        { label: '', text: 'First' },
        { label: '', text: 'Second' },
      ],
    },
  ]);
});
