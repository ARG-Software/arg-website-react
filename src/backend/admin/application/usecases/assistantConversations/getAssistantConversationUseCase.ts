import { createAdminError } from '../../errors.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/IAssistantConversationRepository.js';
import { createAssistantConversationDetail } from './assistantConversationResponse.js';

export interface GetAssistantConversationInput {
  id?: string;
}

export class GetAssistantConversationUseCase {
  constructor(private readonly conversationRepository: IAssistantConversationRepository) {}

  async execute(input: GetAssistantConversationInput = {}) {
    const id = input.id || '';
    const record = await this.conversationRepository.findById(id);
    if (!record) throw createAdminError(404, 'conversation_not_found', 'Conversation not found');

    return createAssistantConversationDetail(record);
  }
}
