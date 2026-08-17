import type {
  AssistantUiCopy,
  AssistantUiCopyResponse,
} from '../../domain/assistant/AssistantUiCopy.js';
import type { AssistantUiCopyTranslator } from '../ports/ProviderPorts.js';
import { getTextDirection, normalizeLanguage } from '../common/language.js';
import { normalizeTranslatedAssistantUiCopy } from '../../application/assistantUiCopy/normalization.js';
import { readAssistantSourceCopy } from './sourceCopy.js';

const translationCache = new Map<string, AssistantUiCopyResponse>();

export { readAssistantSourceCopy };

export async function getAssistantUiCopy(
  language: string | undefined,
  { translator }: { translator?: AssistantUiCopyTranslator } = {}
): Promise<AssistantUiCopyResponse> {
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
  copy: AssistantUiCopy
): AssistantUiCopyResponse {
  return {
    language,
    direction: getTextDirection(language),
    copyVersion,
    copy,
  };
}
