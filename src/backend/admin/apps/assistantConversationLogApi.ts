import { AssistantConversation } from '../domain/assistantConversation.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { checkRateLimits } from '../../shared/security/rateLimit.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/admin/assistant-conversation-log',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export function createAssistantConversationLogApi({
  createDependencies = createAdminDependencies,
  adminConfig,
  env = process.env,
}: IAdminApiFactoryOptions = {}) {
  let appConfig = adminConfig;
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  function getAppConfig() {
    appConfig ||= resolveAdminConfig({
      adminConfig,
      createDependencies,
      defaultCreateDependencies: createAdminDependencies,
      env,
    });
    return appConfig;
  }

  return async function handleAssistantConversationLogApi(request) {
    const originGuardResponse = http.createOriginGuardResponse(request);
    if (originGuardResponse) return originGuardResponse;

    if (request.method === 'OPTIONS') {
      return http.createJsonResponse(request, 204, '');
    }

    if (request.method !== 'POST') {
      return http.createJsonResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed')
      );
    }

    const dependencies = createDependencies({
      config: getAppConfig(),
    }).createAssistantConversationLogDependencies();
    const rateLimitResponse = await createRateLimitResponse(request, dependencies, http);
    if (rateLimitResponse) return rateLimitResponse;

    try {
      const payload = await http.readJsonBody(request);
      const conversation = new AssistantConversation({
        publicConversationId: payload.conversationId,
        messages: payload.messages,
        pageContext: payload.pageContext,
        language: payload.language,
        savedAt: payload.savedAt,
      });

      if (!conversation.hasVisitorMessage()) {
        return http.createJsonResponse(request, 204, '');
      }

      await dependencies.conversationRepository.upsert(conversation);

      return http.createJsonResponse(request, 204, '');
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getLogErrorBody(error));
    }
  };
}

export const handleAssistantConversationLog = createAssistantConversationLogApi();

async function createRateLimitResponse(request, dependencies, http) {
  const clientIp = request.headers.get('x-nf-client-connection-ip') || 'unknown';

  try {
    const rateLimitResult = await checkRateLimits(
      clientIp,
      dependencies.logRateLimit.store,
      dependencies.logRateLimit.config
    );

    if (!rateLimitResult.allowed) {
      return http.createJsonResponse(
        request,
        429,
        createErrorBody('rate_limited', 'Too many requests. Please try again later.')
      );
    }
  } catch (error) {
    console.error('Assistant conversation log rate limit check failed, failing open:', error);
  }

  return null;
}

function getLogErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('conversation_log_failed', 'Unable to log conversation');
}
