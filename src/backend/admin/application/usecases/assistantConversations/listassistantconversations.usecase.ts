import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { getPagination } from '../pagination.js';
import { createAssistantConversationListItem } from './assistantconversation.response.js';

export interface ListAssistantConversationsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListAssistantConversationsUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListAssistantConversationsInput = {}) {
    const pagination = getPagination(input);
    this.logger?.info('Assistant conversations list use case started', pagination);
    const result = await this.conversationRepository.list(pagination);
    this.logger?.info('Assistant conversations list use case completed', {
      recordCount: result.records.length,
      totalRecords: result.pagination.totalRecords,
    });

    return {
      records: result.records.map(createAssistantConversationListItem),
      pagination: result.pagination,
    };
  }
}
