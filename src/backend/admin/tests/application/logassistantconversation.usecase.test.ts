import assert from 'node:assert/strict';
import test from 'node:test';

import { LogAssistantConversationUseCase } from '../../application/usecases/assistantConversations/logassistantconversation.usecase.js';
import { AssistantConversation } from '../../domain/assistantconversation.js';

test('logAssistantConversationUseCase sends a webhook after saving a visitor conversation', async () => {
  let webhookMessage: any = null;
  const useCase = createUseCase({
    webhookProvider: {
      send: async message => {
        webhookMessage = message;
      },
    },
  });

  await useCase.execute(createInput());

  assert.equal(webhookMessage.title, 'New Gaspar conversation');
  assert.equal(webhookMessage.description, 'Can you help with a fintech project?');
  assert.equal(webhookMessage.url, 'https://arg.software/admin/ai-bot/?conversationId=conversation-id');
  assert.deepEqual(webhookMessage.fields.map(field => field.name), [
    'Page',
    'Language',
    'Messages',
    'Last activity',
  ]);
});

test('logAssistantConversationUseCase does not send a webhook for assistant-only logs', async () => {
  let webhookCalled = false;
  let repositoryCalled = false;
  const useCase = createUseCase({
    repository: {
      upsert: async record => {
        repositoryCalled = true;
        return record;
      },
    },
    webhookProvider: {
      send: async () => {
        webhookCalled = true;
      },
    },
  });

  await useCase.execute({
    ...createInput(),
    messages: [{ role: 'assistant', content: 'Hi, how can I help?' }],
  });

  assert.equal(repositoryCalled, false);
  assert.equal(webhookCalled, false);
});

test('logAssistantConversationUseCase succeeds when the webhook fails', async () => {
  let saved = false;
  const useCase = createUseCase({
    repository: {
      upsert: async record => {
        saved = true;
        return { conversation: record, created: true };
      },
    },
    webhookProvider: {
      send: async () => {
        throw new Error('Discord failed');
      },
    },
  });

  await useCase.execute(createInput());

  assert.equal(saved, true);
});

test('logAssistantConversationUseCase does not send a webhook after the first save', async () => {
  let webhookCalled = false;
  const useCase = createUseCase({
    repository: {
      upsert: async record => ({ conversation: record, created: false }),
    },
    webhookProvider: {
      send: async () => {
        webhookCalled = true;
      },
    },
  });

  await useCase.execute(createInput());

  assert.equal(webhookCalled, false);
});

function createUseCase({ repository = {}, webhookProvider = {} } = {}) {
  return new LogAssistantConversationUseCase(
    {
      upsert: async record =>
        ({
          conversation: new AssistantConversation({
            ...record,
            id: 'conversation-id',
          }),
          created: true,
        }),
      ...repository,
    } as any,
    {
      send: async () => {},
      ...webhookProvider,
    } as any,
    'https://arg.software/admin/'
  );
}

function createInput() {
  return {
    publicConversationId: 'public-conversation-id',
    messages: [
      {
        role: 'user',
        content: 'Can you help with a fintech project?',
        createdAt: '2026-08-28T10:00:00.000Z',
      },
      {
        role: 'assistant',
        content: 'Yes, ARG can help.',
        createdAt: '2026-08-28T10:00:01.000Z',
      },
    ],
    pageContext: { pathname: '/working-with-us/', title: 'Working with Us' },
    language: 'en',
    savedAt: '2026-08-28T10:00:01.000Z',
  };
}
