import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { ragContainer, type RagContainer } from '../../di/rag.container.js';
import { ControllerBase } from './controllerbase.js';

export class AssistantController extends ControllerBase {
  constructor(
    private readonly assistant: RagContainer['assistant'],
    private readonly security: RagContainer['security'],
    logger?: ILogger
  ) {
    super(logger);
  }

  @route('GET', '/api/assistant/challenge')
  @errorResponse('challenge_failed', 'Assistant service is temporarily unavailable')
  async challenge(): Promise<Response> {
    return this.json(200, {
      challenge: await this.createAltchaChallenge(this.security.altchaSettings),
    });
  }

  @route('POST', '/api/assistant/ask')
  @errorResponse('answer_failed', 'Unable to answer the question')
  async ask(request: Request): Promise<Response> {
    await this.checkRateLimit(request, this.security.askRateLimiter);

    const payload = await this.body(request);

    await this.verifyAltchaChallenge(payload.altcha, this.security.altchaSettings);

    const result = await this.assistant.askAssistantQuestionUseCase.execute({
      messages: payload.messages,
      pageContext: payload.pageContext,
      preferredLanguage: payload.preferredLanguage,
      question: payload.question,
    });

    return this.json(200, {
      answer: result.answer,
      language: result.language,
      languagePreference: result.languagePreference,
      citations: result.citations,
      articleRecommendations: result.articleRecommendations,
      actions: result.actions,
    });
  }

  @route('GET', '/api/assistant/ui-copy')
  @errorResponse('translation_unavailable', 'Assistant UI translation is temporarily unavailable')
  async uiCopy(request: Request): Promise<Response> {
    return this.json(
      200,
      await this.assistant.getAssistantUiCopyUseCase.execute(this.query(request).language || 'en')
    );
  }
}

let controller: AssistantController;

export function getAssistantRoutes() {
  controller ||= new AssistantController(
    ragContainer.assistant,
    ragContainer.security,
    ragContainer.logger
  );
  return getControllerRoutes(controller);
}
