import { authenticateAdmin } from './auth/userAuthenticator.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { getAccessToken } from '../infrastructure/http/adminCookies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

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
        config: getAppConfig(),
      }).createAssistantConversationAdminDependencies();
      await authenticateAdmin(getAccessToken(request), dependencies);

      if (request.method === 'DELETE') {
        const id = getRequiredConversationId(http.readSearchParams(request));
        await dependencies.conversationRepository.deleteById(id);

        return http.createJsonResponse(request, 204, '');
      }

      const query = http.readSearchParams(request);
      const id = getConversationId(query);

      if (id) {
        const record = await dependencies.conversationRepository.findById(id);
        if (!record)
          throw createAdminError(404, 'conversation_not_found', 'Conversation not found');

        return http.createJsonResponse(request, 200, {
          id: record.id,
          conversationId: record.publicConversationId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          lastMessageAt: record.lastMessageAt,
          messageCount: record.messageCount,
          pagePath: record.pagePath || record.pageContext.pathname || '',
          pageTitle: record.pageContext.title || '',
          language: record.language,
          preview: record.preview,
          messages: record.messages,
          pageContext: record.pageContext,
        });
      }

      const result = await dependencies.conversationRepository.list(getPagination(query));

      return http.createJsonResponse(request, 200, {
        records: result.records.map(record => ({
          id: record.id,
          conversationId: record.publicConversationId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          lastMessageAt: record.lastMessageAt,
          messageCount: record.messageCount,
          pagePath: record.pagePath || record.pageContext.pathname || '',
          pageTitle: record.pageContext.title || '',
          language: record.language,
          preview: record.preview,
        })),
        pagination: result.pagination,
      });
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

function getConversationId(query) {
  return query.id || '';
}

function getRequiredConversationId(query) {
  const id = getConversationId(query);

  if (!id) {
    throw createAdminError(400, 'missing_conversation_id', 'Conversation id is required');
  }

  return id;
}

function getPagination(query) {
  return {
    page: clampNumber(query.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(query.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getAdminConversationErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_conversation_request_failed', 'Admin request failed');
}
