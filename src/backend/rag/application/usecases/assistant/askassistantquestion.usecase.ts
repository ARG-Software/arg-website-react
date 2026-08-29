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
    >
  ) {}

  async execute(input: AskAssistantQuestionInput) {
    return askQuestion({
      ...this.askDependencies,
      question: input.question,
      messages: input.messages,
      pageContext: input.pageContext,
      preferredLanguage: input.preferredLanguage,
    });
  }
}
