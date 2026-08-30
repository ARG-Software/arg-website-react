interface IAssistantConversationRetentionRepository {
  deleteOlderThan(cutoffIso: string): Promise<number>;
}

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeleteOldAssistantConversationsUseCase {
  constructor(private readonly repository: IAssistantConversationRetentionRepository) {}

  async execute(): Promise<{ cutoff: string; deleted: number }> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const deleted = await this.repository.deleteOlderThan(cutoff);

    return { cutoff, deleted };
  }
}
