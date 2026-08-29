import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askassistantquestion.usecase.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getassistantuicopy.usecase.js';
import { createGasparDependencies } from './creategaspardependencies.js';

export function createRagContainer() {
  const dependencies = createGasparDependencies();

  return {
    assistant: {
      askAssistantQuestionUseCase: new AskAssistantQuestionUseCase(
        dependencies.createAskQuestionDependencies()
      ),
      getAssistantUiCopyUseCase: new GetAssistantUiCopyUseCase(
        dependencies.createAssistantUiCopyDependencies()
      ),
    },
    security: {
      altchaSettings: dependencies.altchaSettings,
      askRateLimiter: dependencies.createRateLimitDependencies(),
    },
    logger: dependencies.logger,
  };
}
