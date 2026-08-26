import { createAdminError } from '../../errors.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/IAssistantConversationRepository.js';

export interface DeleteAssistantConversationInput {
  id?: string;
}

export class DeleteAssistantConversationUseCase {
  constructor(private readonly conversationRepository: IAssistantConversationRepository) {}

  async execute(input: DeleteAssistantConversationInput = {}): Promise<void> {
    const id = input.id || '';

    if (!id) {
      throw createAdminError(400, 'missing_conversation_id', 'Conversation id is required');
    }

    await this.conversationRepository.deleteById(id);
  }
}
