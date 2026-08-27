import { ConsoleLogger } from '../../../shared/logger/console.logger.js';

export function createMcpContainer() {
  return {
    logger: new ConsoleLogger(),
  };
}
