const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i;

export function normalizeLanguage(language: string | undefined): string {
  if (!language) return 'en';

  const normalized = language.trim().replace('_', '-');
  const [primary] = normalized.toLowerCase().split('-');

  if (!LANGUAGE_PATTERN.test(normalized)) return 'en';
  if (primary === 'en') return 'en';
  if (primary === 'pt') return 'pt-PT';
  if (primary === 'fr') return 'fr';
  if (primary === 'es') return 'es';

  return primary;
}

export function getTextDirection(language: string): 'ltr' | 'rtl' {
  const [primary] = normalizeLanguage(language).toLowerCase().split('-');
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}
