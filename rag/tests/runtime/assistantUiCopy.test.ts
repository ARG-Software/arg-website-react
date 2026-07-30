import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAssistantUiCopy,
  readAssistantSourceCopy,
} from '../../runtime/assistantUiCopy/getAssistantUiCopy.js';

test('assistant UI copy exposes the manual copy version', () => {
  const source = readAssistantSourceCopy();

  assert.equal(source.copyVersion, '2026-07-30-1');
  assert.equal(source.actions.gaspar_message.label, 'Send message through Gaspar');
  assert.equal(source.leadConfirm.title, 'Send this to ARG?');
});

test('English assistant UI copy returns without calling translation', async () => {
  const result = await getAssistantUiCopy('en');

  assert.equal(result.language, 'en');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.copyVersion, '2026-07-30-1');
  assert.equal(result.copy.labels.send, 'Send');
});

test('non-English assistant UI copy uses the injected translator', async () => {
  const result = await getAssistantUiCopy('pt', {
    translator: {
      async translateAssistantUiCopy() {
        return {
          labels: {
            send: 'Enviar',
          },
        };
      },
    },
  });

  assert.equal(result.language, 'pt-PT');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.copy.labels.send, 'Enviar');
  assert.equal(result.copy.labels.clear, 'Clear conversation');
});
