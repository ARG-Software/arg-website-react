import { normalizeLanguageTag } from '../config/languages.config.js';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

export function normalizeLanguage(language: string | undefined): string {
  return normalizeLanguageTag(language);
}

export function getTextDirection(language: string): 'ltr' | 'rtl' {
  const [primary] = normalizeLanguage(language).toLowerCase().split('-');
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}
