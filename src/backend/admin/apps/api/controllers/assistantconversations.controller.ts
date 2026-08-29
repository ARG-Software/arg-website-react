import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer } from '../../di/admin.container.js';
import { ControllerBase } from './controllerbase.js';

export class AssistantConversationsController extends ControllerBase {
  constructor(
    private readonly conversations = adminContainer.assistantConversations,
    logger?: ILogger
  ) {
    super(logger);
  }

  @route('GET', '/api/admin/assistant-conversations')
  @errorResponse('admin_conversations_request_failed', 'Admin request failed')
  async list(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.conversations.listAssistantConversationsUseCase.execute(this.query(request))
    );
  }

  @route('GET', '/api/admin/assistant-conversation')
  @errorResponse('admin_conversation_request_failed', 'Admin request failed')
  async detail(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.conversations.getAssistantConversationUseCase.execute(this.query(request))
    );
  }

  @route('DELETE', '/api/admin/assistant-conversation')
  @errorResponse('admin_conversation_delete_failed', 'Admin delete request failed')
  async delete(request: Request): Promise<Response> {
    await this.authenticateUser(request);
    await this.conversations.deleteAssistantConversationUseCase.execute(this.query(request));

    return this.json(204, '');
  }

  @route('POST', '/api/admin/assistant-conversation-log')
  @errorResponse('conversation_log_failed', 'Unable to log conversation')
  async log(request: Request): Promise<Response> {
    await this.checkRateLimit(request, this.conversations.conversationLogRateLimiter);

    const payload = await this.body(request);

    await this.conversations.logAssistantConversationUseCase.execute({
      publicConversationId: payload.conversationId,
      messages: payload.messages,
      pageContext: payload.pageContext,
      language: payload.language,
      savedAt: payload.savedAt,
    });

    return this.json(204, '');
  }

}

let controller: AssistantConversationsController;

export function getAssistantConversationRoutes() {
  controller ||= new AssistantConversationsController(
    adminContainer.assistantConversations,
    adminContainer.logger
  );
  return getControllerRoutes(controller);
}
