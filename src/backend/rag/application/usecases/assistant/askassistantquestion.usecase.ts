import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import { askQuestion } from '../../ask/askquestion.js';

export interface AskAssistantQuestionInput {
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
    private readonly logger?: ILogger
  ) {}

  async execute(input: AskAssistantQuestionInput) {
    return logOperation(
      this.logger,
      'Assistant ask use case',
      {
        hasQuestion: Boolean(input.question),
        hasMessages: Boolean(input.messages),
        hasPageContext: Boolean(input.pageContext),
        preferredLanguage: input.preferredLanguage,
      },
      () => askQuestion({
        ...this.askDependencies,
        question: input.question,
        messages: input.messages,
        pageContext: input.pageContext,
        preferredLanguage: input.preferredLanguage,
      }),
      result => ({
        language: result.language,
        citationCount: result.citations.length,
        contextCount: result.contexts?.length ?? 0,
        actionCount: result.actions.length,
      })
    );
  }
}
