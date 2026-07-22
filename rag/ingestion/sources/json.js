import { normalizeText } from '../processing/text.js';

export function flattenJsonToText(value, label = '') {
  const lines = [];
  walk(value, label, lines);
  return normalizeText(lines.join('\n'));
}

function walk(value, label, lines) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => walk(item, label, lines));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      walk(item, formatLabel(label, key), lines);
    });
    return;
  }

  const text = normalizeText(value);

  if (!text) {
    return;
  }

  lines.push(label ? `${label}: ${text}` : text);
}

function formatLabel(parent, key) {
  const formattedKey = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

  return parent ? `${parent} ${formattedKey}` : formattedKey;
}
