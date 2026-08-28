import {
  checkRateLimits,
  type IRateLimitConfig,
  type IRateLimitStore,
} from '../../../../shared/security/ratelimit.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { askQuestion } from '../../ask/askquestion.js';
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
    private readonly askRateLimit: { store: IRateLimitStore; config: IRateLimitConfig },
    private readonly logger?: ILogger
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
      this.logger?.error('Assistant ask rate limit check failed open', { error });
      return;
    }

    if (!rateLimit.allowed) {
      throw createRagError(429, 'rate_limited', 'Too many requests. Please try again later.');
    }
  }
}
