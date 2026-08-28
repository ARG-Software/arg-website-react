import { registerRouteMetadata } from './routeregistry.js';

export function route(method: string, path: string): any {
  return function routeDecorator(...decoratorArgs: any[]) {
    registerRouteMetadata(decoratorArgs, method.toUpperCase(), path);
  };
}
