import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askassistantquestion.usecase.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getassistantuicopy.usecase.js';
import { createGasparDependencies } from './creategaspardependencies.js';

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
