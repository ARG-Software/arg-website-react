import { normalizeText } from './text.js';
import { escapeRegExp } from '../../common/regex.js';

const CV_REDACTIONS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:phone|telephone|tel|mobile|cell|cellphone|contact|whatsapp)\s*[:\-]?\s*(?:\+?\d[\d\s().-]{6,}\d)/gi,
  /\+\d[\d\s().-]{7,}\d/g,
  /\b(?:address|residence|street address|location|based in)\s*:\s*[^\n]+/gi,
  /\b(?:date of birth|birth date|born|dob|age|nationality|marital status)\s*:\s*[^\n]+/gi,
  /(?:^|\n)\s*(?:email|e-mail|linkedin|linked in|github|gitlab|bitbucket|twitter|x|facebook|instagram|portfolio|website|personal website|homepage|social|profile|skype)\s*[:\-]\s*[^\n]+/gi,
  /\bhttps?:\/\/[^\s]+/gi,
  /\bwww\.[^\s]+/gi,
  /(?<![\w.])@[a-z0-9_][a-z0-9_.-]{2,}/gi,
];

const CV_PROHIBITED_PATTERNS = CV_REDACTIONS;

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
