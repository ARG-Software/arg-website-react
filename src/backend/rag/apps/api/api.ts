import type { ControllerRoute } from '../../../shared/api/decorators/index.js';
import { ragContainer } from '../di/rag.container.js';
import { dispatchControllerRoutes } from './controllerroute.handler.js';
import { getAssistantRoutes } from './controllers/assistant.controller.js';
import { getSecurityRoutes } from './controllers/security.controller.js';

export function routeRagRequest(request: Request): Promise<Response> {
  return dispatchControllerRoutes(request, getRagRoutes(), ragContainer.logger);
}

function getRagRoutes(): ControllerRoute[] {
  return [...getAssistantRoutes(), ...getSecurityRoutes()];
}
