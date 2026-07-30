import assistantContent from '@data/assistant.json';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);
const CACHE_PREFIX = 'gaspar_ui_copy';
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i;

export const DEFAULT_ASSISTANT_LANGUAGE = 'en';
export const ASSISTANT_COPY_VERSION = assistantContent.copyVersion;

export function normalizeAssistantLanguage(language) {
  if (!language || typeof language !== 'string') return DEFAULT_ASSISTANT_LANGUAGE;

  const normalized = language.trim().replace('_', '-');
  const [primary] = normalized.toLowerCase().split('-');

  if (!LANGUAGE_PATTERN.test(normalized)) return DEFAULT_ASSISTANT_LANGUAGE;
  if (primary === 'en') return 'en';
  if (primary === 'pt') return 'pt-PT';
  if (primary === 'fr') return 'fr';
  if (primary === 'es') return 'es';

  return primary;
}

export function getAssistantTextDirection(language) {
  const [primary] = normalizeAssistantLanguage(language).toLowerCase().split('-');
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}

export function getBrowserAssistantLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_ASSISTANT_LANGUAGE;
  return normalizeAssistantLanguage(navigator.languages?.[0] || navigator.language);
}

export function mergeAssistantCopy(translation) {
  if (!translation || typeof translation !== 'object') return assistantContent;

  return {
    ...assistantContent,
    statusText: translation.statusText || assistantContent.statusText,
    quickPrompts: mergeStringArray(assistantContent.quickPrompts, translation.quickPrompts),
    leadCaptureQuickPrompts: mergeStringArray(
      assistantContent.leadCaptureQuickPrompts,
      translation.leadCaptureQuickPrompts
    ),
    leadCaptureSkipWords: mergeStringArray(
      assistantContent.leadCaptureSkipWords,
      translation.leadCaptureSkipWords
    ),
    messages: mergeRecord(assistantContent.messages, translation.messages),
    actions: mergeActions(assistantContent.actions, translation.actions),
    labels: mergeRecord(assistantContent.labels, translation.labels),
    leadConfirm: mergeRecord(assistantContent.leadConfirm, translation.leadConfirm),
    placeholders: mergeRecord(assistantContent.placeholders, translation.placeholders),
  };
}

export function getAssistantCopyCacheKey(language) {
  return `${CACHE_PREFIX}:${normalizeAssistantLanguage(language)}:${ASSISTANT_COPY_VERSION}`;
}

export function readCachedAssistantCopy(language) {
  if (typeof localStorage === 'undefined') return null;

  try {
    const cached = localStorage.getItem(getAssistantCopyCacheKey(language));
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (parsed?.copyVersion !== ASSISTANT_COPY_VERSION) return null;

    return mergeAssistantCopy(parsed.copy);
  } catch {
    return null;
  }
}

export function writeCachedAssistantCopy(language, copy) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(
      getAssistantCopyCacheKey(language),
      JSON.stringify({ copyVersion: ASSISTANT_COPY_VERSION, copy })
    );
  } catch {
    /* storage unavailable */
  }
}

function mergeRecord(fallback, translation) {
  if (!translation || typeof translation !== 'object') return fallback;

  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [
      key,
      typeof translation[key] === 'string' && translation[key].trim() ? translation[key] : value,
    ])
  );
}

function mergeStringArray(fallback, translation) {
  if (!Array.isArray(translation)) return fallback;

  const translated = translation.filter(item => typeof item === 'string' && item.trim());
  return translated.length > 0 ? translated : fallback;
}

function mergeActions(fallback, translation) {
  if (!translation || typeof translation !== 'object') return fallback;

  return Object.fromEntries(
    Object.entries(fallback).map(([key, action]) => [
      key,
      {
        ...action,
        label:
          typeof translation[key]?.label === 'string' && translation[key].label.trim()
            ? translation[key].label
            : action.label,
      },
    ])
  );
}
