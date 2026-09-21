import { routeAssistantConversationRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/admin/assistant-conversation-log',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default function assistantConversationLog(request, context) {
  return routeAssistantConversationRequest(createAssistantConversationLogRequest(request, context));
}

export function createAssistantConversationLogRequest(request, context = {}) {
  const headers = new Headers(request.headers);
  const geo = context.geo || {};

  setHeader(headers, 'x-nf-client-connection-ip', context.ip);
  setHeader(headers, 'x-country', geo.country?.code);
  setHeader(headers, 'x-region', geo.subdivision?.name || geo.subdivision?.code);
  setHeader(headers, 'x-city', geo.city);
  setHeader(headers, 'x-timezone', geo.timezone);

  return new Request(request, { headers });
}

function setHeader(headers, name, value) {
  if (value) headers.set(name, value);
}
