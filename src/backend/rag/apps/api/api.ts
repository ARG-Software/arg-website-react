import type { ControllerRoute } from '../../../shared/api/decorators/index.js';
import { dispatchControllerRoutes } from './controllerRouteHandler.js';
import { getAssistantRoutes } from './controllers/AssistantController.js';
import { getSecurityRoutes } from './controllers/SecurityController.js';

export function routeRagRequest(request: Request): Promise<Response> {
  return dispatchControllerRoutes(request, getRagRoutes());
}

function getRagRoutes(): ControllerRoute[] {
  return [...getAssistantRoutes(), ...getSecurityRoutes()];
}
