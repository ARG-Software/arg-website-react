import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { stripEmojis, stripEmojisFromMarkdown, findMarkdownEmoji } = require(
  '../../scripts/lib/strip-emojis.cjs'
);

test('strips emoji from titles and headings while keeping code fences', () => {
  const markdown = `---
title: Surviving the AI Tsunami
subtitle: A plan 🧠
---
## Starting Line 🏁

1. Design out loud 🗣

\`\`\`ts
const ok = true; // 🚀
\`\`\`
`;

  const stripped = stripEmojisFromMarkdown(markdown);
  assert.equal(stripped.includes('🏁'), false);
  assert.equal(stripped.includes('🧠'), false);
  assert.equal(stripped.includes('🗣'), false);
  assert.equal(stripped.includes('const ok = true; // 🚀'), true);
  assert.equal(findMarkdownEmoji(stripped, 'post.md').length, 0);
});

test('stripEmojis collapses leftover spaces', () => {
  assert.equal(stripEmojis('Shifting the Conversation to the Starting Line 🏁'), 'Shifting the Conversation to the Starting Line');
});
