import { checkRateLimits, type IRateLimitConfig, type IRateLimitStore } from '../../../../shared/security/ratelimit.js';
import type { IAssistantConversationRepository } from '../../ports/repositories/iassistantconversation.repository.js';
import { AssistantConversation } from '../../../domain/assistantconversation.js';
import type { AssistantConversationConstructorParams } from '../../../domain/types/assistantconversation.types.js';

export interface LogAssistantConversationInput extends AssistantConversationConstructorParams {
  clientIp: string;
}

export class LogAssistantConversationUseCase {
  constructor(
    private readonly conversationRepository: IAssistantConversationRepository,
    private readonly logRateLimit: { store: IRateLimitStore; config: IRateLimitConfig }
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

      console.error('Assistant conversation log rate limit check failed, failing open:', error);
    }

    const conversation = new AssistantConversation(input);

    if (!conversation.hasVisitorMessage()) return;

    await this.conversationRepository.upsert(conversation);
  }
}
