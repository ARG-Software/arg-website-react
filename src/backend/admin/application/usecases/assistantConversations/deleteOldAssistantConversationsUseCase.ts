import type { IAssistantConversationRepository } from '../../ports/repositories/IAssistantConversationRepository.js';

const RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeleteOldAssistantConversationsUseCase {
  constructor(private readonly conversationRepository: IAssistantConversationRepository) {}

  async execute(): Promise<{ cutoff: string; deleted: number }> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const deleted = await this.conversationRepository.deleteOlderThan(cutoff);

    return { cutoff, deleted };
  }
}
