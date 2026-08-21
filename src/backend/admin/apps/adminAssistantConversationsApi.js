import { authenticateAdmin } from '../application/admin/authenticateAdmin.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import {
  createAssistantConversationDetailResponse,
  createAssistantConversationListResponse,
} from '../domain/assistantConversation.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';

const ALLOWED_METHODS = 'GET, DELETE, OPTIONS';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export const config = {
  path: '/api/admin/assistant-conversations',
  method: ['GET', 'DELETE', 'OPTIONS'],
};

export function createAdminAssistantConversationsApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleAdminAssistantConversationsApi(request) {
    try {
      const originGuardResponse = http.createOriginGuardResponse(request);
      if (originGuardResponse) return originGuardResponse;

      if (request.method === 'OPTIONS') {
        return http.createJsonResponse(request, 204, '');
      }

      if (!['GET', 'DELETE'].includes(request.method)) {
        return http.createJsonResponse(
          request,
          405,
          createErrorBody('method_not_allowed', 'Method not allowed')
        );
      }

      const dependencies = createDependencies({
        env,
      }).createAssistantConversationAdminDependencies();
      await authenticateAdmin(getBearerToken(request), dependencies);

      if (request.method === 'DELETE') {
        const id = getRequiredConversationId(request);
        await dependencies.conversationRepository.deleteById(id);

        return http.createJsonResponse(request, 204, '');
      }

      const id = getConversationId(request);

      if (id) {
        const record = await dependencies.conversationRepository.findById(id);
        if (!record)
          throw createAdminError(404, 'conversation_not_found', 'Conversation not found');

        return http.createJsonResponse(
          request,
          200,
          createAssistantConversationDetailResponse(record)
        );
      }

      const result = await dependencies.conversationRepository.list(getPagination(request));

      return http.createJsonResponse(request, 200, createAssistantConversationListResponse(result));
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getAdminConversationErrorBody(error));
    }
  };
}

export const handleAdminAssistantConversations = createAdminAssistantConversationsApi();

function getBearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  return token || '';
}

function getConversationId(request) {
  return new URL(request.url).searchParams.get('id') || '';
}

function getRequiredConversationId(request) {
  const id = getConversationId(request);

  if (!id) {
    throw createAdminError(400, 'missing_conversation_id', 'Conversation id is required');
  }

  return id;
}

function getPagination(request) {
  const params = new URL(request.url).searchParams;

  return {
    page: clampNumber(params.get('page'), DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(params.get('pageSize'), 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getAdminConversationErrorBody(error) {
  if (error?.code && error?.statusCode) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_conversation_request_failed', 'Admin request failed');
}
