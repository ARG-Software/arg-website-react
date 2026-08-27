import type { AssistantConversation } from '../../../domain/assistantconversation.js';

export function createAssistantConversationListItem(record: AssistantConversation) {
  return {
    id: record.id,
    conversationId: record.publicConversationId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastMessageAt: record.lastMessageAt,
    messageCount: record.messageCount,
    pagePath: record.pagePath || record.pageContext.pathname || '',
    pageTitle: record.pageContext.title || '',
    language: record.language,
    preview: record.preview,
  };
}

export function createAssistantConversationDetail(record: AssistantConversation) {
  return {
    ...createAssistantConversationListItem(record),
    messages: record.messages,
    pageContext: record.pageContext,
  };
}
