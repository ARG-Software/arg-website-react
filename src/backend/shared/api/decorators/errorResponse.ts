import { wrapMethod } from './methodDecorator.js';

export function errorResponse(fallbackCode: string, fallbackMessage: string): any {
  return function errorResponseDecorator(...decoratorArgs: any[]) {
    return wrapMethod(
      decoratorArgs,
      method => async function decoratedErrorResponse(request: Request, ...args: any[]) {
        try {
          return await method.call(this, request, ...args);
        } catch (error) {
          const statusCode = this.errorStatus(error);

          if (statusCode === 500) {
            console.error(error);
          }

          const response = this.json(
            statusCode,
            this.errorBody(error, fallbackCode, fallbackMessage)
          );

          if (statusCode === 429 && error?.retryAfterSeconds) {
            response.headers.set('Retry-After', String(error.retryAfterSeconds));
          }

          return response;
        }
      }
    );
  };
}
