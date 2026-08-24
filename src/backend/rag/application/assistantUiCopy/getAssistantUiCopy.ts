import type {
  IAssistantUiCopy,
  IAssistantUiCopyResponse,
} from '../../domain/assistant/IAssistantUiCopy.js';
import type { IAssistantUiCopyTranslator } from '../ports/IProviderPorts.js';
import { getTextDirection, normalizeLanguage } from '../common/language.js';
import { normalizeTranslatedAssistantUiCopy } from '../../application/assistantUiCopy/normalization.js';
import { readAssistantSourceCopy } from './sourceCopy.js';

const translationCache = new Map<string, IAssistantUiCopyResponse>();

export { readAssistantSourceCopy };

export async function getAssistantUiCopy(
  language: string | undefined,
  { translator }: { translator?: IAssistantUiCopyTranslator } = {}
): Promise<IAssistantUiCopyResponse> {
  const source = readAssistantSourceCopy();
  const normalizedLanguage = normalizeLanguage(language);
  const cacheKey = `${normalizedLanguage}:${source.copyVersion}`;

  if (normalizedLanguage === 'en') {
    return createResponse(normalizedLanguage, source.copyVersion, source);
  }

  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  if (!translator) {
    throw new Error('assistant UI copy translator is required');
  }

  const translated = await translator.translateAssistantUiCopy(source, normalizedLanguage);
  const response = createResponse(
    normalizedLanguage,
    source.copyVersion,
    normalizeTranslatedAssistantUiCopy(source, translated)
  );

  translationCache.set(cacheKey, response);
  return response;
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
