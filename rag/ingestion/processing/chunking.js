import { getChunkingConfig } from '../../config/env.js';
import { normalizeText } from './text.js';

export function chunkText(text, options = {}) {
  const config = getChunkingConfig();
  const chunkSize = options.chunkSize ?? config.chunkSize;
  const chunkOverlap = options.chunkOverlap ?? config.chunkOverlap;
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error('Chunk overlap must be smaller than chunk size');
  }

  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && `${current}\n\n${paragraph}`.length > chunkSize) {
      chunks.push(current);
      current = tail(current, chunkOverlap);
    }

    if (paragraph.length > chunkSize) {
      chunks.push(...splitLongText(paragraph, chunkSize, chunkOverlap));
      current = '';
      continue;
    }

    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map(normalizeText).filter(Boolean);
}

function splitLongText(text, chunkSize, chunkOverlap) {
  const chunks = [];
  const step = chunkSize - chunkOverlap;

  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + chunkSize));
  }

  return chunks;
}

function tail(text, length) {
  if (length <= 0) {
    return '';
  }

  return text.slice(Math.max(0, text.length - length));
}
