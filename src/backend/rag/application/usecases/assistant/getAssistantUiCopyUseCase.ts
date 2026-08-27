import { getAssistantUiCopy } from '../../assistantUiCopy/getAssistantUiCopy.js';

export class GetAssistantUiCopyUseCase {
  constructor(private readonly dependencies: Parameters<typeof getAssistantUiCopy>[1]) {}

  execute(language?: string) {
    return getAssistantUiCopy(language, this.dependencies);
  }
}
