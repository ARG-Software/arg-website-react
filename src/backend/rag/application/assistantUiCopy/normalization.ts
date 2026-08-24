import type {
  IAssistantActionCopy,
  IAssistantUiCopy,
} from '../../domain/assistant/IAssistantUiCopy.js';

export function parseTranslatedAssistantUiCopy(
  content: string | undefined
): Partial<IAssistantUiCopy> {
  if (!content) return {};

  const json = content
    .trim()
    .replace(/^```(?:json)?/iu, '')
    .replace(/```$/u, '')
    .trim();

  try {
    return JSON.parse(json) as Partial<IAssistantUiCopy>;
  } catch {
    return {};
  }
}

export function normalizeTranslatedAssistantUiCopy(
  fallback: IAssistantUiCopy,
  translation: Partial<IAssistantUiCopy>
): IAssistantUiCopy {
  return {
    statusText: readString(translation.statusText, fallback.statusText),
    quickPrompts: readTranslatedStringArray(fallback.quickPrompts, translation.quickPrompts),
    leadCaptureQuickPrompts: readTranslatedStringArray(
      fallback.leadCaptureQuickPrompts,
      translation.leadCaptureQuickPrompts
    ),
    leadCaptureSkipWords: readStringArray(
      translation.leadCaptureSkipWords,
      fallback.leadCaptureSkipWords
    ),
    messages: readTranslatedRecord(fallback.messages, translation.messages),
    actions: readTranslatedActions(fallback.actions, translation.actions),
    labels: readTranslatedRecord(fallback.labels, translation.labels),
    leadConfirm: readTranslatedRecord(fallback.leadConfirm, translation.leadConfirm),
    placeholders: readTranslatedRecord(fallback.placeholders, translation.placeholders),
  };
}

export function readActionCopy(value: unknown): Record<string, IAssistantActionCopy> {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, action]) => {
        if (!action || typeof action !== 'object') return null;
        const label = readString((action as Record<string, unknown>).label);
        return label ? [key, { label }] : null;
      })
      .filter((entry): entry is [string, IAssistantActionCopy] => Boolean(entry))
  );
}

export function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, readString(entry)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

export function readStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;

  const strings = value.filter(
    (item): item is string => typeof item === 'string' && Boolean(item.trim())
  );
  return strings.length > 0 ? strings : fallback;
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readTranslatedRecord(
  fallback: Record<string, string>,
  translation: unknown
): Record<string, string> {
  const translated = readStringRecord(translation);

  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [key, translated[key] || value])
  );
}

function readTranslatedActions(
  fallback: Record<string, IAssistantActionCopy>,
  translation: unknown
): Record<string, IAssistantActionCopy> {
  const translated = readActionCopy(translation);

  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [
      key,
      { label: translated[key]?.label || value.label },
    ])
  );
}

function readTranslatedStringArray(fallback: string[], translation: unknown): string[] {
  const translated = readStringArray(translation);
  return translated.length === fallback.length ? translated : fallback;
}
