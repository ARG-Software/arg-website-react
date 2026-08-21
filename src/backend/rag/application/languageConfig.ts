import languageConfigJson from '../config/languages.json' with { type: 'json' };

const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

interface LanguageConfig {
  defaultLanguage: string;
  normalization: Record<string, string>;
  aliases: Record<string, string>;
}

const languageConfig = languageConfigJson as LanguageConfig;
const normalizedAliases = Object.fromEntries(
  Object.entries(languageConfig.aliases).map(([name, tag]) => [normalizeLanguageName(name), tag])
);

export function normalizeLanguageTag(language: string | undefined): string {
  if (!language) return languageConfig.defaultLanguage;

  const normalized = language.trim().replace(/_/g, '-');
  const [primary] = normalized.toLowerCase().split('-');

  if (!LANGUAGE_PATTERN.test(normalized)) return languageConfig.defaultLanguage;

  if (normalized.includes('-')) {
    return normalizeTagCase(normalized);
  }

  return languageConfig.normalization[primary] ?? normalizeTagCase(normalized);
}

export function getLanguageTagForName(languageName: string): string | null {
  const normalizedName = normalizeLanguageName(languageName);
  const alias = normalizedAliases[normalizedName];

  if (alias) {
    return alias;
  }

  if (LANGUAGE_PATTERN.test(languageName.trim())) {
    return normalizeLanguageTag(languageName);
  }

  return null;
}

function normalizeLanguageName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeTagCase(tag: string): string {
  const [primary, ...subtags] = tag.split('-');

  return [
    primary.toLowerCase(),
    ...subtags.map(subtag =>
      subtag.length === 4
        ? `${subtag.charAt(0).toUpperCase()}${subtag.slice(1).toLowerCase()}`
        : subtag.length === 2
          ? subtag.toUpperCase()
          : subtag.toLowerCase()
    ),
  ].join('-');
}

