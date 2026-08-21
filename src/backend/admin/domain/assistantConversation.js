import { createAdminError } from '../application/errors.js';

const MAX_MESSAGES = 80;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;
const MAX_CITATIONS = 10;
const MAX_ACTIONS = 10;
const MAX_TEXT_LENGTH = 256;
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const VALID_ROLES = new Set(['user', 'assistant']);

export function createAssistantConversationLogRecord(payload = {}, clock = new Date()) {
  const publicConversationId = normalizeConversationId(payload.conversationId);
  const messages = normalizeMessages(payload.messages);
  const pageContext = normalizePageContext(payload.pageContext);
  const language = cleanText(payload.language, 24);
  const lastMessageAt = getLastMessageAt(messages, clock);

  return {
    publicConversationId,
    payload: {
      conversationId: publicConversationId,
      messages,
      pageContext,
      language,
      savedAt: clock.toISOString(),
    },
    metadata: {
      messageCount: messages.length,
      pagePath: pageContext.pathname || null,
      language: language || null,
      lastMessageAt,
    },
  };
}

export function createAssistantConversationListResponse(result) {
  return {
    records: result.records.map(record => createAssistantConversationResponse(record)),
    pagination: result.pagination,
  };
}

export function createAssistantConversationDetailResponse(record) {
  return {
    record: createAssistantConversationResponse(record, { includeTranscript: true }),
  };
}

export function hasVisitorMessage(record) {
  return record.payload.messages.some(message => message.role === 'user');
}

export function createAssistantConversationResponse(record, { includeTranscript = false } = {}) {
  const messages = Array.isArray(record.payload?.messages) ? record.payload.messages : [];
  const pageContext = record.payload?.pageContext || {};

  return {
    id: record.id,
    conversationId: record.publicConversationId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastMessageAt: record.lastMessageAt,
    messageCount: record.messageCount,
    pagePath: record.pagePath || pageContext.pathname || '',
    pageTitle: pageContext.title || '',
    language: record.language || record.payload?.language || '',
    preview: record.preview || getConversationPreview(messages),
    ...(includeTranscript ? { messages, pageContext } : {}),
  };
}

export function getConversationPreview(messages) {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content);
  const content =
    firstUserMessage?.content || messages.find(message => message.content)?.content || '';

  return truncateText(content, 140);
}

function normalizeConversationId(value) {
  const conversationId = String(value || '').trim();

  if (!CONVERSATION_ID_PATTERN.test(conversationId)) {
    throw createAdminError(400, 'invalid_conversation_id', 'Invalid conversation id');
  }

  return conversationId;
}

function normalizeMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw createAdminError(400, 'invalid_messages', 'Conversation must include messages');
  }

  const messages = value.slice(0, MAX_MESSAGES).map(normalizeMessage).filter(Boolean);

  if (messages.length === 0) {
    throw createAdminError(400, 'invalid_messages', 'Conversation must include valid messages');
  }

  return messages;
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null;

  const role = String(message.role || '').trim();
  const content = cleanText(message.content, MAX_MESSAGE_CONTENT_LENGTH);

  if (!VALID_ROLES.has(role) || !content) return null;

  return {
    role,
    content,
    ...(message.source ? { source: cleanText(message.source, 40) } : {}),
    ...(message.language ? { language: cleanText(message.language, 24) } : {}),
    ...(message.createdAt ? { createdAt: normalizeDate(message.createdAt) } : {}),
    ...(Array.isArray(message.citations)
      ? {
          citations: message.citations
            .slice(0, MAX_CITATIONS)
            .map(normalizeReference)
            .filter(Boolean),
        }
      : {}),
    ...(Array.isArray(message.articleRecommendations)
      ? {
          articleRecommendations: message.articleRecommendations
            .slice(0, MAX_CITATIONS)
            .map(normalizeReference)
            .filter(Boolean),
        }
      : {}),
    ...(Array.isArray(message.actions)
      ? { actions: message.actions.slice(0, MAX_ACTIONS).map(normalizeAction).filter(Boolean) }
      : {}),
  };
}

function normalizeReference(item) {
  if (!item || typeof item !== 'object') return null;

  return {
    title: cleanText(item.title, MAX_TEXT_LENGTH),
    url: cleanText(item.url, MAX_TEXT_LENGTH),
  };
}

function normalizeAction(action) {
  if (!action || typeof action !== 'object') return null;
  const type = cleanText(action.type, 80);

  return type ? { type } : null;
}

function normalizePageContext(value) {
  if (!value || typeof value !== 'object') return {};

  return {
    pathname: cleanText(value.pathname, MAX_TEXT_LENGTH),
    title: cleanText(value.title, MAX_TEXT_LENGTH),
    ...(value.activeSection ? { activeSection: cleanText(value.activeSection, 80) } : {}),
  };
}

function getLastMessageAt(messages, clock) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const createdAt = normalizeDate(messages[index].createdAt);
    if (createdAt) return createdAt;
  }

  return clock.toISOString();
}

function normalizeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function cleanText(value, maxLength) {
  return removeControlCharacters(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function removeControlCharacters(value) {
  return [...value]
    .map(character => {
      const code = character.charCodeAt(0);

      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('');
}

function truncateText(value, maxLength) {
  const text = cleanText(value, maxLength + 1);

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}
