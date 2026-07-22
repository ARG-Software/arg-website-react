import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeText } from '../processing/text.js';

export async function loadPdfSource(filePath, metadata = {}) {
  const content = await extractPdfText(filePath);

  return {
    sourceType: 'portfolio_pdf',
    sourceKey: metadata.sourceKey ?? path.basename(filePath),
    title: metadata.title ?? 'ARG Software Portfolio',
    url: metadata.url ?? '/files/portfolio.pdf',
    path: filePath,
    metadata,
    content,
  };
}

export async function extractPdfText(filePath) {
  const buffer = await readFile(filePath);
  const pdfParse = await import('pdf-parse');

  if (typeof pdfParse.default === 'function') {
    const parsed = await pdfParse.default(buffer);
    return normalizeText(parsed.text);
  }

  if (pdfParse.PDFParse) {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy?.();
    return normalizeText(parsed.text);
  }

  throw new Error('Unsupported pdf-parse API');
}
