import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { checkRateLimits, type IRateLimitConfig, type IRateLimitStore } from '../../../../shared/security/ratelimit.js';
import type { IWebhookProvider } from '../../ports/iwebhook.provider.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { AssistantConversation } from '../../../domain/assistantconversation.js';
import type { AssistantConversationConstructorParams } from '../../../domain/types/assistantconversation.types.js';

export interface LogAssistantConversationInput extends AssistantConversationConstructorParams {
  clientIp: string;
}

export class LogAssistantConversationUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly webhookProvider: IWebhookProvider,
    private readonly adminSiteUrl: string,
    private readonly logRateLimit: { store: IRateLimitStore; config: IRateLimitConfig },
    private readonly logger?: ILogger
  ) {}

  async execute(input: LogAssistantConversationInput): Promise<void> {
    try {
      const rateLimit = await checkRateLimits(
        input.clientIp,
        this.logRateLimit.store,
        this.logRateLimit.config
      );

      if (!rateLimit.allowed) {
        const error = new Error('Too many requests. Please try again later.') as Error & {
          code: string;
          statusCode: number;
        };
        error.code = 'rate_limited';
        error.statusCode = 429;
        throw error;
      }
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'rate_limited') throw error;

      this.logger?.error('Assistant conversation log rate limit check failed open', { error });
    }

    const conversation = new AssistantConversation(input);

    if (!conversation.hasVisitorMessage()) return;

    const savedConversation = await this.conversationRepository.upsert(conversation);
    await this.notifyWebhook(savedConversation);
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
