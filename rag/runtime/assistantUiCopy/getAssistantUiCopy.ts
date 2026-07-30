import { deepSeekAssistantUiCopyTranslator } from '../../clients/deepseekAssistantUiCopyTranslator.js';
import type {
  AssistantUiCopy,
  AssistantUiCopyResponse,
} from '../../core/types/assistantUiCopy.js';
import type { AssistantUiCopyTranslator } from '../../core/types/providers.js';
import { getTextDirection, normalizeLanguage } from '../../utils/language.js';
import { normalizeTranslatedAssistantUiCopy } from '../../utils/assistantUiCopy.js';
import { readAssistantSourceCopy } from './sourceCopy.js';

const translationCache = new Map<string, AssistantUiCopyResponse>();

export { readAssistantSourceCopy };

export async function getAssistantUiCopy(
  language: string | undefined,
  { translator = deepSeekAssistantUiCopyTranslator }: { translator?: AssistantUiCopyTranslator } = {}
): Promise<AssistantUiCopyResponse> {
  const source = readAssistantSourceCopy();
  const normalizedLanguage = normalizeLanguage(language);
  const cacheKey = `${normalizedLanguage}:${source.copyVersion}`;

  if (normalizedLanguage === 'en') {
    return createResponse(normalizedLanguage, source.copyVersion, source);
  }

  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

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
  copy: AssistantUiCopy
): AssistantUiCopyResponse {
  return {
    language,
    direction: getTextDirection(language),
    copyVersion,
    copy,
  };
}
