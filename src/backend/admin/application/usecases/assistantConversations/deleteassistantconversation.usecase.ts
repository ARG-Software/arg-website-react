import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';

export interface DeleteAssistantConversationInput {
  id?: string;
}

export class DeleteAssistantConversationUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: DeleteAssistantConversationInput = {}): Promise<void> {
    const id = input.id || '';

    if (!id) {
      this.logger?.warn('Assistant conversation delete rejected', { reason: 'missing_conversation_id' });
      throw createAdminError(400, 'missing_conversation_id', 'Conversation id is required');
    }

    this.logger?.info('Assistant conversation delete started', { conversationId: id });
    await this.conversationRepository.deleteById(id);
    this.logger?.info('Assistant conversation delete completed', { conversationId: id });
  }
}
