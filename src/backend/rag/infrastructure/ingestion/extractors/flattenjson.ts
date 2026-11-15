import { normalizeText } from '../../../application/ingestion/processing/text.js';

// Data files mark UI-only fields with "ragIgnore": a list of keys Gaspar skips in that object and everything below it.
const IGNORE_KEY = 'ragIgnore';

// `ignored` carries the file's top-level ragIgnore when a loader flattens only part of the file.
export function flattenJsonToText(value: unknown, label = '', ignored: unknown = []): string {
  const lines: string[] = [];
  walk(value, label, lines, new Set(Array.isArray(ignored) ? (ignored as string[]) : []));
  return normalizeText(lines.join('\n'));
}

function walk(value: unknown, label: string, lines: string[], ignored: Set<string>): void {
  if (value === null || value === undefined || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => walk(item, label, lines, ignored));
    return;
  }

  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    let scope = ignored;
    if (Array.isArray(object[IGNORE_KEY])) {
      scope = new Set([...ignored, ...(object[IGNORE_KEY] as string[]), IGNORE_KEY]);
    }
    Object.entries(object).forEach(([key, item]) => {
      if (key === IGNORE_KEY || scope.has(key)) return;
      walk(item, formatLabel(label, key), lines, scope);
    });
    return;
  }

  const text = normalizeText(value);

  if (text) {
    lines.push(label ? `${label}: ${text}` : text);
  }
}

function formatLabel(parent: string, key: string): string {
  const formattedKey = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

  return parent ? `${parent} ${formattedKey}` : formattedKey;
}
