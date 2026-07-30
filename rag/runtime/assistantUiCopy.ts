import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getDeepSeekConfig } from '../config/env.js';
import { getTextDirection, normalizeLanguage } from '../utils/language.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const ASSISTANT_COPY_PATH = resolve(process.cwd(), 'src/data/assistant.json');
const translationCache = new Map<string, AssistantUiCopyResponse>();

interface AssistantActionCopy {
  label: string;
}

export interface AssistantUiCopy {
  statusText: string;
  quickPrompts: string[];
  leadCaptureQuickPrompts: string[];
  leadCaptureSkipWords: string[];
  messages: Record<string, string>;
  actions: Record<string, AssistantActionCopy>;
  labels: Record<string, string>;
  leadConfirm: Record<string, string>;
  placeholders: Record<string, string>;
}

interface AssistantSourceCopy extends AssistantUiCopy {
  copyVersion: string;
}

export interface AssistantUiCopyResponse {
  language: string;
  direction: 'ltr' | 'rtl';
  copyVersion: string;
  copy: AssistantUiCopy;
}

interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function getAssistantUiCopy(language: string | undefined): Promise<AssistantUiCopyResponse> {
  const source = readAssistantSourceCopy();
  const normalizedLanguage = normalizeLanguage(language);
  const cacheKey = `${normalizedLanguage}:${source.copyVersion}`;

  if (normalizedLanguage === 'en') {
    return createResponse(normalizedLanguage, source.copyVersion, source);
  }

  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const translated = await translateAssistantCopy(source, normalizedLanguage);
  const response = createResponse(
    normalizedLanguage,
    source.copyVersion,
    normalizeTranslatedCopy(source, translated)
  );

  translationCache.set(cacheKey, response);
  return response;
}

export function readAssistantSourceCopy(): AssistantSourceCopy {
  const source = JSON.parse(readFileSync(ASSISTANT_COPY_PATH, 'utf8')) as Record<string, unknown>;

  return {
    copyVersion: readString(source.copyVersion, '1'),
    statusText: readString(source.statusText, 'online now'),
    quickPrompts: readStringArray(source.quickPrompts),
    leadCaptureQuickPrompts: readStringArray(source.leadCaptureQuickPrompts),
    leadCaptureSkipWords: readStringArray(source.leadCaptureSkipWords),
    messages: readStringRecord(source.messages),
    actions: readActionCopy(source.actions),
    labels: readStringRecord(source.labels),
    leadConfirm: readStringRecord(source.leadConfirm),
    placeholders: readStringRecord(source.placeholders),
  };
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

async function translateAssistantCopy(
  source: AssistantUiCopy,
  language: string
): Promise<Partial<AssistantUiCopy>> {
  const config = getDeepSeekConfig();
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      temperature: 0,
      thinking: { type: 'disabled' },
      messages: [
        {
          role: 'system',
          content: buildTranslationPrompt(language),
        },
        {
          role: 'user',
          content: JSON.stringify(source),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Assistant UI copy translation failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as DeepSeekChatCompletionResponse;
  return parseTranslatedCopy(data.choices?.[0]?.message?.content);
}

function buildTranslationPrompt(language: string): string {
  return [
    `Translate the JSON values to ${language}.`,
    'Return only valid JSON with the exact same object shape and keys.',
    'Translate string values and string array values only. Never rename, add, or remove keys.',
    'Keep ARG Software, ARG, Gaspar, email addresses, URLs, placeholders, analytics names, and product/project names unchanged.',
    'For leadCaptureSkipWords, return short natural user inputs that mean skip/no message in the target language.',
    'Keep the tone warm, concise, and professional.',
  ].join(' ');
}

function parseTranslatedCopy(content: string | undefined): Partial<AssistantUiCopy> {
  if (!content) return {};

  const json = content
    .trim()
    .replace(/^```(?:json)?/iu, '')
    .replace(/```$/u, '')
    .trim();

  try {
    return JSON.parse(json) as Partial<AssistantUiCopy>;
  } catch {
    return {};
  }
}

function normalizeTranslatedCopy(
  fallback: AssistantUiCopy,
  translation: Partial<AssistantUiCopy>
): AssistantUiCopy {
  return {
    statusText: readString(translation.statusText, fallback.statusText),
    quickPrompts: readTranslatedStringArray(fallback.quickPrompts, translation.quickPrompts),
    leadCaptureQuickPrompts: readTranslatedStringArray(
      fallback.leadCaptureQuickPrompts,
      translation.leadCaptureQuickPrompts
    ),
    leadCaptureSkipWords: readStringArray(translation.leadCaptureSkipWords, fallback.leadCaptureSkipWords),
    messages: readTranslatedRecord(fallback.messages, translation.messages),
    actions: readTranslatedActions(fallback.actions, translation.actions),
    labels: readTranslatedRecord(fallback.labels, translation.labels),
    leadConfirm: readTranslatedRecord(fallback.leadConfirm, translation.leadConfirm),
    placeholders: readTranslatedRecord(fallback.placeholders, translation.placeholders),
  };
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
  fallback: Record<string, AssistantActionCopy>,
  translation: unknown
): Record<string, AssistantActionCopy> {
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

function readActionCopy(value: unknown): Record<string, AssistantActionCopy> {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, action]) => {
        if (!action || typeof action !== 'object') return null;
        const label = readString((action as Record<string, unknown>).label);
        return label ? [key, { label }] : null;
      })
      .filter((entry): entry is [string, AssistantActionCopy] => Boolean(entry))
  );
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, readString(entry)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

function readStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;

  const strings = value.filter(
    (item): item is string => typeof item === 'string' && Boolean(item.trim())
  );
  return strings.length > 0 ? strings : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
