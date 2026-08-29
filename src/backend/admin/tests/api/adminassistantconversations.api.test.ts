import assert from 'node:assert/strict';
import test from 'node:test';

import { AssistantConversationsController } from '../../apps/api/controllers/assistantconversations.controller.js';
import { ACCESS_COOKIE_NAME } from '../../apps/http/usersession.cookies.js';
import { DeleteAssistantConversationUseCase } from '../../application/usecases/assistantConversations/deleteassistantconversation.usecase.js';
import { GetAssistantConversationUseCase } from '../../application/usecases/assistantConversations/getassistantconversation.usecase.js';
import { ListAssistantConversationsUseCase } from '../../application/usecases/assistantConversations/listassistantconversations.usecase.js';
import { LogAssistantConversationUseCase } from '../../application/usecases/assistantConversations/logassistantconversation.usecase.js';
import { AssistantConversation } from '../../domain/assistantconversation.js';

class TestAssistantConversationsController extends AssistantConversationsController {
  protected override authenticateUser(): Promise<any> {
    return Promise.resolve({ email: 'admin@arg.software' });
  }
}

test('logs assistant conversations through the public write-only endpoint', async () => {
  let savedRecord;
  const api = createTestApi({
    async upsert(record) {
      savedRecord = record;
      return { conversation: record, created: true };
    },
  });
  const response = await api(createConversationLogRequest());

  assert.equal(response.status, 204);
  assert.equal(savedRecord.publicConversationId, 'conversation-test-1');
  assert.equal(savedRecord.messageCount, 2);
  assert.equal(savedRecord.pagePath, '/');
});

test('ignores assistant-only conversation logs through the public write-only endpoint', async () => {
  let upsertCalled = false;
  const api = createTestApi({
    async upsert() {
      upsertCalled = true;
    },
  });
  const response = await api(createAssistantOnlyConversationLogRequest());

  assert.equal(response.status, 204);
  assert.equal(upsertCalled, false);
});

test('rate limits assistant conversation logs before reading the body', async () => {
  let upsertCalled = false;
  const api = createTestApi(
    {
      async upsert() {
        upsertCalled = true;
      },
    },
    { allowed: false, retryAfterSeconds: 30 }
  );
  const response = await api(
    new Request('https://arg.software/api/admin/assistant-conversation-log', {
      method: 'POST',
      headers: { 'x-nf-client-connection-ip': '203.0.113.10' },
      body: '{',
    })
  );
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '30');
  assert.equal(body.error.code, 'rate_limited');
  assert.equal(upsertCalled, false);
});


test('lists assistant conversations through the authenticated admin endpoint', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/assistant-conversations'));
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

test('gets assistant conversation detail through the authenticated admin endpoint', async () => {
  const api = createTestApi();
  const response = await api(createAdminRequest('/api/admin/assistant-conversation?id=conversation-id'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.id, 'conversation-id');
  assert.equal(body.messages.length, 2);
});

test('deletes assistant conversations through the authenticated admin endpoint', async () => {
  let deletedId = '';
  const api = createTestApi({
    async deleteById(id) {
      deletedId = id;
    },
  });
  const response = await api(
    createAdminRequest('/api/admin/assistant-conversation?id=conversation-id', 'DELETE')
  );

  assert.equal(response.status, 204);
  assert.equal(deletedId, 'conversation-id');
});

function createTestApi(repositoryOverrides = {}, rateLimitResult = { allowed: true }) {
  const conversation = createConversationRecord();
  const repository = {
    async upsert(record) {
      return { conversation: record, created: true };
    },
    async list() {
      return {
        records: [conversation],
        pagination: { page: 1, pageSize: 10, totalRecords: 1, totalPages: 1 },
      };
    },
    async findById() {
      return conversation;
    },
    async deleteById() {},
    ...repositoryOverrides,
  };
  const controller = new TestAssistantConversationsController({
    deleteAssistantConversationUseCase: new DeleteAssistantConversationUseCase(repository as any),
    getAssistantConversationUseCase: new GetAssistantConversationUseCase(repository as any),
    listAssistantConversationsUseCase: new ListAssistantConversationsUseCase(repository as any),
    logAssistantConversationUseCase: new LogAssistantConversationUseCase(repository as any, {
      send: async () => {},
    } as any, 'https://arg.software'),
    conversationLogRateLimiter: {
      async check() {
        return rateLimitResult;
      },
    },
  } as any);

  return async function api(request) {
    const { pathname } = new URL(request.url);
    if (request.method === 'POST' && pathname === '/api/admin/assistant-conversation-log') {
      return controller.log(request);
    }
    if (request.method === 'GET' && pathname === '/api/admin/assistant-conversations') {
      return controller.list(request);
    }
    if (request.method === 'GET' && pathname === '/api/admin/assistant-conversation') {
      return controller.detail(request);
    }
    if (request.method === 'DELETE' && pathname === '/api/admin/assistant-conversation') {
      return controller.delete(request);
    }

    return new Response(null, { status: 404 });
  };
}

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

function createAssistantOnlyConversationLogRequest() {
  return new Request('https://arg.software/api/admin/assistant-conversation-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://arg.software',
    },
    body: JSON.stringify({
      conversationId: 'conversation-test-2',
      messages: [
        {
          role: 'assistant',
          content: 'Hi, how can I help?',
          createdAt: '2026-08-21T10:00:00.000Z',
        },
      ],
      pageContext: { pathname: '/', title: 'ARG' },
      language: 'en',
    }),
  });
}

function createAdminRequest(path, method = 'GET') {
  return new Request(`https://arg.software${path}`, {
    method,
    headers: {
      Origin: 'https://arg.software',
      Cookie: `${ACCESS_COOKIE_NAME}=token`,
    },
  });
}

function createConversationRecord() {
  return new AssistantConversation({
    id: 'conversation-id',
    publicConversationId: 'conversation-public-id',
    messages: [
      { role: 'user', content: 'What do you do?', createdAt: '2026-08-21T10:00:00.000Z' },
      { role: 'assistant', content: 'We build software.', createdAt: '2026-08-21T10:00:01.000Z' },
    ],
    pageContext: { pathname: '/', title: 'ARG' },
    language: 'en',
    savedAt: '2026-08-21T10:00:01.000Z',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:01.000Z',
  });
}
