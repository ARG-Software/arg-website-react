import { registerMethodMetadata } from './methodDecorator.js';

export interface ControllerRoute {
  method: string;
  path: string;
  handler(request: Request): Promise<Response>;
}

interface ControllerRouteMetadata {
  method: string;
  path: string;
  propertyKey: PropertyKey;
}

const routesByTarget = new WeakMap<object, ControllerRouteMetadata[]>();

export function registerRouteMetadata(decoratorArgs: any[], method: string, path: string): void {
  registerMethodMetadata(decoratorArgs, (target, propertyKey) => {
    addRoute(target, propertyKey, method, path);
  });
}

export function getControllerRoutes(controller: object): ControllerRoute[] {
  const metadata = routesByTarget.get(Object.getPrototypeOf(controller)) || [];

  return metadata.map(route => ({
    method: route.method,
    path: route.path,
    handler: (controller as any)[route.propertyKey].bind(controller),
  }));
}

function addRoute(target: object, propertyKey: PropertyKey, method: string, path: string): void {
  const existingRoutes = routesByTarget.get(target) || [];
  const routes = existingRoutes.filter(route => route.propertyKey !== propertyKey);

  routes.push({ method: method.toUpperCase(), path, propertyKey });
  routesByTarget.set(target, routes);
}
