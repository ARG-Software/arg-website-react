import type { ControllerRoute } from '../../../shared/api/decorators/index.js';
import { dispatchControllerRoutes } from './controllerRouteHandler.js';
import { getAssistantConversationRoutes } from './controllers/AssistantConversationsController.js';
import { getAuthRoutes } from './controllers/AuthController.js';
import { getOutreachRoutes } from './controllers/OutreachController.js';
import { getUserRoutes } from './controllers/UserController.js';
import { getVisitRoutes } from './controllers/VisitsController.js';

const ROUTE_MAP = {
  admin: (): ControllerRoute[] => [
    ...getAuthRoutes(),
    ...getUserRoutes(),
    ...getOutreachRoutes(),
    ...getVisitRoutes(),
    ...getAssistantConversationRoutes(),
  ],
  auth: getAuthRoutes,
  user: getUserRoutes,
  outreach: getOutreachRoutes,
  visit: getVisitRoutes,
  assistantConversation: getAssistantConversationRoutes,
};

export function routeAdminRequest(request: Request): Promise<Response> {
  return routeRequest('admin', request);
}

export function routeAuthRequest(request: Request): Promise<Response> {
  return routeRequest('auth', request);
}

export function routeUserRequest(request: Request): Promise<Response> {
  return routeRequest('user', request);
}

export function routeOutreachRequest(request: Request): Promise<Response> {
  return routeRequest('outreach', request);
}

export function routeVisitRequest(request: Request): Promise<Response> {
  return routeRequest('visit', request);
}

export function routeAssistantConversationRequest(request: Request): Promise<Response> {
  return routeRequest('assistantConversation', request);
}

function routeRequest(type: keyof typeof ROUTE_MAP, request: Request): Promise<Response> {
  return dispatchControllerRoutes(request, ROUTE_MAP[type]());
}
