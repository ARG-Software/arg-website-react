import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators.js';
import { getClientIp } from '../../../../shared/api/http.js';
import { ragContainer } from '../../di/ragContainer.js';
import { ControllerBase } from './ControllerBase.js';

export class AssistantController extends ControllerBase {
  constructor(private readonly assistant = ragContainer.assistant) {
    super();
  }

  @route('GET', '/api/assistant/challenge')
  @errorResponse('challenge_failed', 'Assistant service is temporarily unavailable')
  async challenge(): Promise<Response> {
    return this.json(200, {
      challenge: await this.assistant.createAssistantChallengeUseCase.execute(),
    });
  }

  @route('POST', '/api/assistant/ask')
  @errorResponse('answer_failed', 'Unable to answer the question')
  async ask(request: Request): Promise<Response> {
    const payload = await this.body(request);
    const result = await this.assistant.askAssistantQuestionUseCase.execute({
      altcha: payload.altcha,
      clientIp: getClientIp(request),
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
  controller ||= new AssistantController();
  return getControllerRoutes(controller);
}
