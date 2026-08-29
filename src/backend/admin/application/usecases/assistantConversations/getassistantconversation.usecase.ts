import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { createAssistantConversationDetail } from './assistantconversation.response.js';

export interface GetAssistantConversationInput {
  id?: string;
}

export class GetAssistantConversationUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: GetAssistantConversationInput = {}) {
    const id = input.id || '';
    this.logger?.info('Assistant conversation detail use case started', { conversationId: id });
    const record = await this.conversationRepository.findById(id);
    if (!record) {
      this.logger?.warn('Assistant conversation detail rejected', {
        reason: 'not_found',
        conversationId: id,
      });
      throw createAdminError(404, 'conversation_not_found', 'Conversation not found');
    }

    this.logger?.info('Assistant conversation detail use case completed', { conversationId: id });

    return createAssistantConversationDetail(record);
  }
}
