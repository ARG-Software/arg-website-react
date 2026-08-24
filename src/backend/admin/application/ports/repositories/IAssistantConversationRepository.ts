import type { AssistantConversation } from '../../../domain/assistantConversation.js';
import type { AssistantConversationPagination } from '../../../domain/types/AssistantConversationTypes.js';

export interface IAssistantConversationRepository {
  upsert(conversation: AssistantConversation): Promise<AssistantConversation>;
  list(pagination?: { page?: number; pageSize?: number }): Promise<{
    records: AssistantConversation[];
    pagination: AssistantConversationPagination;
  }>;
  findById(id: string): Promise<AssistantConversation | null>;
  deleteById(id: string): Promise<void>;
  deleteOlderThan(cutoffIso: string): Promise<number>;
}
