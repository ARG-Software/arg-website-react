import type { AssistantConversation } from '../../../domain/assistantconversation.js';
import type { AssistantConversationPagination } from '../../../domain/types/assistantconversation.types.js';

export type AssistantConversationUpsertResult = {
  conversation: AssistantConversation;
  created: boolean;
};

export interface IAssistantConversationRepository {
  upsert(conversation: AssistantConversation): Promise<AssistantConversationUpsertResult>;
  list(pagination?: { page?: number; pageSize?: number }): Promise<{
    records: AssistantConversation[];
    pagination: AssistantConversationPagination;
  }>;
  findById(id: string): Promise<AssistantConversation | null>;
  deleteById(id: string): Promise<void>;
  deleteOlderThan(cutoffIso: string): Promise<number>;
}
