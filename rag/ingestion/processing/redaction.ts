import { normalizeText } from './text.js';

const CV_REDACTIONS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:phone|telephone|tel|mobile|contact)\s*[:\-]?\s*(?:\+?\d[\d\s().-]{6,}\d)/gi,
  /\+\d[\d\s().-]{7,}\d/g,
  /\b(?:address|residence|street address)\s*:\s*[^\n]+/gi,
  /\b(?:date of birth|birth date|born|dob|age|nationality|marital status)\s*:\s*[^\n]+/gi,
  /\bhttps?:\/\/[^\s]+/gi,
];

const CV_PROHIBITED_PATTERNS = CV_REDACTIONS.slice(0, -1);

export function redactCvContent(content: string, literals: string[] = []): string {
  let redacted = content;

  for (const literal of literals) {
    const value = literal.trim();
    if (value) {
      redacted = redacted.replace(new RegExp(escapeRegExp(value), 'gi'), '[redacted]');
    }
  }

  for (const pattern of CV_REDACTIONS) {
    redacted = redacted.replace(pattern, '[redacted]');
  }

  const normalized = normalizeText(redacted);

  for (const literal of literals) {
    if (literal.trim() && normalized.toLowerCase().includes(literal.trim().toLowerCase())) {
      throw new Error('CV redaction did not remove a configured personal-data literal');
    }
  }

  for (const pattern of CV_PROHIBITED_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(normalized)) {
      throw new Error('CV redaction left prohibited personal data in extracted content');
    }
  }

  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
