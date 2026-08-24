import type { AssistantConversation, AssistantConversationList } from '../../domain/assistantConversation.js';

export interface IAssistantConversationRepository {
  upsert(conversation: AssistantConversation): Promise<AssistantConversation>;
  list(pagination?: { page?: number; pageSize?: number }): Promise<AssistantConversationList>;
  findById(id: string): Promise<AssistantConversation | null>;
  deleteById(id: string): Promise<void>;
  deleteOlderThan(cutoffIso: string): Promise<number>;
}
