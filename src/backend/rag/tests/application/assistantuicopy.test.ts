import assert from 'node:assert/strict';
import test from 'node:test';

import { readAssistantSourceCopy } from '../../application/assistantcopy/sourcecopy.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getassistantuicopy.usecase.js';
import { createFakeAnswerProvider } from '../fakes/fakeanswer.provider.js';

test('assistant UI copy exposes the manual copy version', () => {
  const source = readAssistantSourceCopy();

  assert.equal(source.copyVersion, '2026-08-27-1');
  assert.equal(source.actions.gaspar_message.label, 'Want me to contact the team?');
  assert.equal(source.leadConfirm.title, 'Send this to ARG?');
});

test('English assistant UI copy returns without calling translation', async () => {
  const useCase = new GetAssistantUiCopyUseCase(
    createFakeAnswerProvider('unused', {
      onTranslateAssistantUiCopy() {
        throw new Error('English copy must not be translated');
      },
    })
  );
  const result = await useCase.execute('en');

  assert.equal(result.language, 'en');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.copyVersion, '2026-08-27-1');
  assert.equal(result.copy.labels.send, 'Send');
});

test('non-English assistant UI copy uses the injected translator', async () => {
  const useCase = new GetAssistantUiCopyUseCase(
    createFakeAnswerProvider('unused', {
      translatedUiCopy: {
        labels: {
          send: 'Enviar',
        },
      },
    })
  );
  const result = await useCase.execute('pt');

  assert.equal(result.language, 'pt-PT');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.copy.labels.send, 'Enviar');
  assert.equal(result.copy.labels.clear, 'Clear conversation');
});
