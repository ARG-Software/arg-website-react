import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IAssistantUiCopy,
  IAssistantUiCopyResponse,
} from '../../../domain/assistant/assistantcopy.types.js';
import type { ILlmProvider } from '../../ports/iproviderports.js';
import { normalizeTranslatedAssistantUiCopy } from '../../assistantcopy/normalization.js';
import { readAssistantSourceCopy } from '../../assistantcopy/sourcecopy.js';
import { getTextDirection, normalizeLanguage } from '../../shared/language.js';

export class GetAssistantUiCopyUseCase {
  private readonly translationCache = new Map<string, IAssistantUiCopyResponse>();

  constructor(
    private readonly translator: ILlmProvider,
    private readonly logger?: ILogger
  ) {}

  execute(language?: string): Promise<IAssistantUiCopyResponse> {
    return logOperation(
      this.logger,
      'Assistant UI copy use case',
      { language: language || 'en' },
      () => this.getCopy(language)
    );
  }

  private async getCopy(language: string | undefined): Promise<IAssistantUiCopyResponse> {
    const source = readAssistantSourceCopy();
    const normalizedLanguage = normalizeLanguage(language);
    const cacheKey = `${normalizedLanguage}:${source.copyVersion}`;

    if (normalizedLanguage === 'en') {
      return createResponse(normalizedLanguage, source.copyVersion, source);
    }

    const cached = this.translationCache.get(cacheKey);
    if (cached) return cached;

    const translated = await this.translator.translateAssistantUiCopy(source, normalizedLanguage);
    const response = createResponse(
      normalizedLanguage,
      source.copyVersion,
      normalizeTranslatedAssistantUiCopy(source, translated)
    );

    this.translationCache.set(cacheKey, response);
    return response;
  }
}

function createResponse(
  language: string,
  copyVersion: string,
  copy: IAssistantUiCopy
): IAssistantUiCopyResponse {
  return {
    language,
    direction: getTextDirection(language),
    copyVersion,
    copy,
  };
}
