import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IWebhookProvider } from '../../ports/iwebhook.provider.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { AssistantConversation } from '../../../domain/assistantconversation.js';
import type { AssistantConversationConstructorParams } from '../../../domain/types/assistantconversation.types.js';

export type LogAssistantConversationInput = AssistantConversationConstructorParams;

export class LogAssistantConversationUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly webhookProvider: IWebhookProvider,
    private readonly adminSiteUrl: string,
    private readonly logger?: ILogger
  ) {}

  async execute(input: LogAssistantConversationInput): Promise<void> {
    const conversation = new AssistantConversation(input);

    if (!conversation.hasVisitorMessage()) return;

    const savedConversation = await this.conversationRepository.upsert(conversation);
    if (savedConversation.created) {
      await this.notifyWebhook(savedConversation.conversation);
    }
  }

  private async notifyWebhook(conversation: AssistantConversation): Promise<void> {
    try {
      await this.webhookProvider.send({
        title: 'New Gaspar conversation',
        description: conversation.preview || 'A visitor started a conversation with Gaspar.',
        url: createConversationUrl(this.adminSiteUrl, conversation.id),
        fields: [
          { name: 'Page', value: conversation.pagePath || '-' },
          { name: 'Language', value: conversation.language || '-' },
          { name: 'Messages', value: String(conversation.messageCount) },
          { name: 'Last activity', value: conversation.lastMessageAt || conversation.savedAt },
        ],
      });
    } catch (error) {
      this.logger?.error('Assistant conversation webhook failed', {
        error,
        conversationId: conversation.id,
      });
    }
  }
}

function createConversationUrl(adminSiteUrl: string, conversationId?: string): string {
  const url = new URL('ai-bot/', adminSiteUrl);
  if (conversationId) url.searchParams.set('conversationId', conversationId);

  return url.toString();
}
