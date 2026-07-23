import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { RagSource, RagSourceMetadata } from '../../types/ingestion.js';
import { normalizeText } from '../processing/text.js';

export interface PdfSourceMetadata extends RagSourceMetadata {
  filePath?: string;
  sourceKey?: string;
  title?: string;
  url?: string;
}

export interface RequiredPdfSourceMetadata extends PdfSourceMetadata {
  filePath: string;
  sourceKey: string;
  title: string;
  url: string;
}

export async function loadPdfSource(
  filePath: string,
  metadata: PdfSourceMetadata = {}
): Promise<RagSource> {
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

export async function extractPdfText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const pdfParse = await import('pdf-parse');

  const parserModule = pdfParse as typeof pdfParse & {
    default?: (data: Buffer) => Promise<{ text: string }>;
  };

  if (typeof parserModule.default === 'function') {
    const parsed = await parserModule.default(buffer);
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
