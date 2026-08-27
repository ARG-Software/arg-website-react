import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askAssistantQuestionUseCase.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getAssistantUiCopyUseCase.js';
import { createGasparDependencies } from './createGasparDependencies.js';

export function createRagContainer() {
  const dependencies = createGasparDependencies();

  return {
    assistant: {
      askAssistantQuestionUseCase: new AskAssistantQuestionUseCase(
        dependencies.createAskQuestionDependencies(),
        dependencies.createRateLimitDependencies()
      ),
      getAssistantUiCopyUseCase: new GetAssistantUiCopyUseCase(
        dependencies.createAssistantUiCopyDependencies()
      ),
    },
    security: {
      altchaSettings: dependencies.altchaSettings,
    },
  };
}
