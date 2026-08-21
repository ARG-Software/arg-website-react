const ADMIN_ASSISTANT_CONVERSATIONS_ENDPOINT = '/api/admin/assistant-conversations';

export async function fetchAssistantConversations(accessToken, query = {}) {
  const response = await fetch(createAssistantConversationsUrl(query), {
    headers: createAuthHeaders(accessToken),
  });

  return readAdminResponse(response);
}

export async function fetchAssistantConversation(accessToken, id) {
  const response = await fetch(createAssistantConversationsUrl({ id }), {
    headers: createAuthHeaders(accessToken),
  });

  return readAdminResponse(response);
}

export async function deleteAssistantConversation(accessToken, id) {
  const response = await fetch(createAssistantConversationsUrl({ id }), {
    method: 'DELETE',
    headers: createAuthHeaders(accessToken),
  });

  if (response.status === 204) return { deleted: true };

  return readAdminResponse(response);
}

function createAuthHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function createAssistantConversationsUrl(query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search
    ? `${ADMIN_ASSISTANT_CONVERSATIONS_ENDPOINT}?${search}`
    : ADMIN_ASSISTANT_CONVERSATIONS_ENDPOINT;
}

async function readAdminResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || 'Admin request failed');
  }

  return data;
}
