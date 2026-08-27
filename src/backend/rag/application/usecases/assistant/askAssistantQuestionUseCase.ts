import {
  checkRateLimits,
  type IRateLimitConfig,
  type IRateLimitStore,
} from '../../../../shared/security/rateLimit.js';
import { askQuestion } from '../../ask/askQuestion.js';
import { createRagError } from '../../errors.js';

export interface AskAssistantQuestionInput {
  clientIp: string;
  messages?: unknown;
  pageContext?: unknown;
  preferredLanguage?: string;
  question?: unknown;
}

export class AskAssistantQuestionUseCase {
  constructor(
    private readonly askDependencies: Omit<
      Parameters<typeof askQuestion>[0],
      'question' | 'messages' | 'pageContext' | 'preferredLanguage'
    >,
    private readonly askRateLimit: { store: IRateLimitStore; config: IRateLimitConfig }
  ) {}

  async execute(input: AskAssistantQuestionInput) {
    await this.checkRateLimit(input.clientIp);

    return askQuestion({
      ...this.askDependencies,
      question: input.question,
      messages: input.messages,
      pageContext: input.pageContext,
      preferredLanguage: input.preferredLanguage,
    });
  }

  private async checkRateLimit(clientIp: string): Promise<void> {
    let rateLimit;

    try {
      rateLimit = await checkRateLimits(clientIp, this.askRateLimit.store, this.askRateLimit.config);
    } catch (error) {
      console.error('Rate limit check failed, failing open:', error);
      return;
    }

    if (!rateLimit.allowed) {
      throw createRagError(429, 'rate_limited', 'Too many requests. Please try again later.');
    }
  }
}
