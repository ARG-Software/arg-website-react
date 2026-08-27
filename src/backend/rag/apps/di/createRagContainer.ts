import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askAssistantQuestionUseCase.js';
import { GetAssistantUiCopyUseCase } from '../../application/usecases/assistant/getAssistantUiCopyUseCase.js';
import { CreateHumanChallengeUseCase } from '../../application/usecases/security/createHumanChallengeUseCase.js';
import { VerifySecurityPayloadUseCase } from '../../application/usecases/security/verifySecurityPayloadUseCase.js';
import { createGasparDependencies } from './createGasparDependencies.js';

export function createRagContainer() {
  const dependencies = createGasparDependencies();
  const humanVerification = dependencies.createHumanVerificationDependencies();

  return {
    assistant: {
      askAssistantQuestionUseCase: new AskAssistantQuestionUseCase(
        dependencies.createAskQuestionDependencies(),
        humanVerification,
        dependencies.createRateLimitDependencies()
      ),
      createAssistantChallengeUseCase: new CreateHumanChallengeUseCase(humanVerification),
      getAssistantUiCopyUseCase: new GetAssistantUiCopyUseCase(
        dependencies.createAssistantUiCopyDependencies()
      ),
    },
    security: {
      createSecurityChallengeUseCase: new CreateHumanChallengeUseCase(humanVerification),
      verifySecurityPayloadUseCase: new VerifySecurityPayloadUseCase(humanVerification),
    },
  };
}
