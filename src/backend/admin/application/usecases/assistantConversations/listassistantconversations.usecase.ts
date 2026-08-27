import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { getPagination } from '../pagination.js';
import { createAssistantConversationListItem } from './assistantconversation.response.js';

export interface ListAssistantConversationsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListAssistantConversationsUseCase {
  constructor(private readonly conversationRepository: IAssistantConversationRepository) {}

  async execute(input: ListAssistantConversationsInput = {}) {
    const result = await this.conversationRepository.list(getPagination(input));

    return {
      records: result.records.map(createAssistantConversationListItem),
      pagination: result.pagination,
    };
  }
}
