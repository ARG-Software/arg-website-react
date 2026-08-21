import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminAssistantConversationsApi } from '../../apps/adminAssistantConversationsApi.js';
import { createAssistantConversationLogApi } from '../../apps/assistantConversationLogApi.js';

test('logs assistant conversations through the public write-only endpoint', async () => {
  let savedRecord;
  const api = createAssistantConversationLogApi({
    createDependencies: () => ({
      createAssistantConversationLogDependencies() {
        return {
          conversationRepository: {
            async upsert(record) {
              savedRecord = record;
            },
          },
          logRateLimit: {
            config: { perMinute: 20, perDay: 200, globalDaily: 1000, salt: 'test' },
            store: {
              async hit() {
                return { allowed: true };
              },
            },
          },
        };
      },
    }),
  });
  const response = await api(createConversationLogRequest());

  assert.equal(response.status, 204);
  assert.equal(savedRecord.publicConversationId, 'conversation-test-1');
  assert.equal(savedRecord.metadata.messageCount, 2);
  assert.equal(savedRecord.metadata.pagePath, '/');
});

test('lists assistant conversations through the authenticated admin endpoint', async () => {
  const api = createAdminAssistantConversationsApi({
    createDependencies: () => createConversationAdminDependencies(),
  });
  const response = await api(createAdminRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.records.length, 1);
  assert.equal(body.records[0].preview, 'What do you do?');
  assert.deepEqual(body.pagination, {
    page: 1,
    pageSize: 10,
    totalRecords: 1,
    totalPages: 1,
  });
});

test('deletes assistant conversations through the authenticated admin endpoint', async () => {
  let deletedId = '';
  const api = createAdminAssistantConversationsApi({
    createDependencies: () =>
      createConversationAdminDependencies({
        conversationRepository: {
          async deleteById(id) {
            deletedId = id;
          },
        },
      }),
  });
  const response = await api(createAdminRequest('?id=conversation-id', { method: 'DELETE' }));

  assert.equal(response.status, 204);
  assert.equal(deletedId, 'conversation-id');
});

function createConversationLogRequest() {
  return new Request('https://arg.software/api/admin/assistant-conversation-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
    },
    body: JSON.stringify({
      conversationId: 'conversation-test-1',
      messages: [
        { role: 'user', content: 'What do you do?', createdAt: '2026-08-21T10:00:00.000Z' },
        { role: 'assistant', content: 'We build software.', createdAt: '2026-08-21T10:00:01.000Z' },
      ],
      pageContext: { pathname: '/', title: 'ARG' },
      language: 'en',
    }),
  });
}

function createAdminRequest(search = '', options = {}) {
  return new Request(`https://arg.software/api/admin/assistant-conversations${search}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: 'Bearer token',
      Origin: 'https://arg.software',
    },
  });
}

function createConversationAdminDependencies({ conversationRepository } = {}) {
  const repository = conversationRepository || {
    async list() {
      return {
        records: [createConversationRecord()],
        pagination: { page: 1, pageSize: 10, totalRecords: 1, totalPages: 1 },
      };
    },
    async findById() {
      return createConversationRecord();
    },
    async deleteById() {},
  };

  return {
    createAssistantConversationAdminDependencies() {
      return {
        adminAccessPolicy: {
          async canAccess() {
            return true;
          },
        },
        conversationRepository: repository,
        identityProvider: {
          async getUser() {
            return { email: 'admin@arg.software' };
          },
        },
      };
    },
  };
}

function createConversationRecord() {
  return {
    id: 'conversation-id',
    publicConversationId: 'conversation-public-id',
    payload: {
      messages: [
        { role: 'user', content: 'What do you do?', createdAt: '2026-08-21T10:00:00.000Z' },
        { role: 'assistant', content: 'We build software.', createdAt: '2026-08-21T10:00:01.000Z' },
      ],
      pageContext: { pathname: '/', title: 'ARG' },
      language: 'en',
    },
    messageCount: 2,
    pagePath: '/',
    language: 'en',
    lastMessageAt: '2026-08-21T10:00:01.000Z',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:01.000Z',
  };
}
