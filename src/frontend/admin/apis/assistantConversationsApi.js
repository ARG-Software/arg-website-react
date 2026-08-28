import { readAdminResponse } from './adminResponse.js';

const ADMIN_ASSISTANT_CONVERSATIONS_ENDPOINT = '/api/admin/assistant-conversations';
const ADMIN_ASSISTANT_CONVERSATION_ENDPOINT = '/api/admin/assistant-conversation';

export async function fetchAssistantConversations(query = {}) {
  const response = await fetch(
    createAssistantConversationsUrl(ADMIN_ASSISTANT_CONVERSATIONS_ENDPOINT, query)
  );

  return readAdminResponse(response);
}

export async function fetchAssistantConversation(id) {
  const response = await fetch(
    createAssistantConversationsUrl(ADMIN_ASSISTANT_CONVERSATION_ENDPOINT, { id })
  );

  return readAdminResponse(response);
}

export async function deleteAssistantConversation(id) {
  const response = await fetch(
    createAssistantConversationsUrl(ADMIN_ASSISTANT_CONVERSATION_ENDPOINT, { id }),
    { method: 'DELETE' }
  );

  if (response.status === 204) return { deleted: true };

  return readAdminResponse(response);
}

function createAssistantConversationsUrl(endpoint, query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${endpoint}?${search}` : endpoint;
}
