import { readFile } from 'node:fs/promises';

import { normalizeText } from '../processing/text.js';

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
