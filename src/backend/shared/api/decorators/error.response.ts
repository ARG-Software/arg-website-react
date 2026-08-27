import { wrapMethod } from './methoddecorator.js';

export function errorResponse(fallbackCode: string, fallbackMessage: string): any {
  return function errorResponseDecorator(...decoratorArgs: any[]) {
    return wrapMethod(
      decoratorArgs,
      method => async function decoratedErrorResponse(this: any, request: Request, ...args: any[]) {
        try {
          return await method.call(this, request, ...args);
        } catch (error) {
          const handledError = error as any;
          const statusCode = this.errorStatus(handledError);
          const level = statusCode >= 500 ? 'error' : 'warn';
          this.logger?.[level]('Controller request handled error', {
            method: request.method,
            path: new URL(request.url).pathname,
            status: statusCode,
            code: handledError?.code ?? fallbackCode,
            error: handledError,
          });

          const response = this.json(
            statusCode,
            this.errorBody(handledError, fallbackCode, fallbackMessage)
          );

          if (statusCode === 429 && handledError?.retryAfterSeconds) {
            response.headers.set('Retry-After', String(handledError.retryAfterSeconds));
          }

          return response;
        }
      }
    );
  };
}
