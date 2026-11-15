import assert from 'node:assert/strict';
import test from 'node:test';

import { flattenJsonToText } from '../../../../../../../src/backend/rag/infrastructure/ingestion/extractors/flattenjson.js';

test('ragIgnore drops the listed keys in its object and everything below it', () => {
  const text = flattenJsonToText(
    {
      ragIgnore: ['thumbnail', 'hoverLabel'],
      items: [{ question: 'How long?', thumbnail: '/a.webp', cta: { label: 'Ask', hoverLabel: 'Go' } }],
    },
    'faq'
  );

  assert.equal(text, 'faq items question: How long?\nfaq items cta label: Ask');
});

test('ragIgnore only applies inside the object that declares it', () => {
  const text = flattenJsonToText({ hero: { ragIgnore: ['label'], label: 'UI' }, stat: { label: 'Deploys' } });

  assert.equal(text, 'stat label: Deploys');
});
