import { normalizeText } from './text.js';

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 180;

interface ChunkTextOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export function chunkText(text: unknown, options: ChunkTextOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
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

function splitLongText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const chunks = [];
  const step = chunkSize - chunkOverlap;

  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + chunkSize));
  }

  return chunks;
}

function tail(text: string, length: number): string {
  if (length <= 0) {
    return '';
  }

  return text.slice(Math.max(0, text.length - length));
}
