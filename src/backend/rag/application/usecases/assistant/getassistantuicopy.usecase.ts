import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import { getAssistantUiCopy } from '../../assistantUiCopy/getassistantuicopy.js';

export class GetAssistantUiCopyUseCase {
  constructor(
    private readonly dependencies: Parameters<typeof getAssistantUiCopy>[1],
    private readonly logger?: ILogger
  ) {}

  execute(language?: string) {
    return logOperation(
      this.logger,
      'Assistant UI copy use case',
      { language: language || 'en' },
      () => getAssistantUiCopy(language, this.dependencies)
    );
  }
}
