import { extractPdfText } from '../extractors/extractpdftext.js';
import { redactCvContent } from '../../../application/ingestion/processing/redaction.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IIngestionRunOptions } from '../../../application/ingestion/iingestion.types.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import type { ILocalDocumentManifestEntry } from '../sourcemanifest.types.js';
import { isPathInDirectory, matchesFileSelection, resolveRoot } from './loaderfiles.js';

export async function loadLocalDocumentSource(
  rootDir: string,
  document: ILocalDocumentManifestEntry,
  selection?: IIngestionRunOptions
): Promise<IRagSource[]> {
  validateLocalDocument(document, rootDir);

  if (!matchesFileSelection(resolveRoot(rootDir, document.filePath), selection)) {
    return [];
  }

  const documentPath = resolveRoot(rootDir, document.filePath);
  const extractedContent = await extractPdfText(documentPath);

  return [
    createSource({
      sourceType: 'local_document',
      sourceKey: document.sourceKey,
      title: document.title,
      url: document.citationUrl,
      path: documentPath,
      isPublic: document.isPublic ?? true,
      metadata: {
        ...document,
        source_file: documentPath,
        person_key: typeof document.personKey === 'string' ? document.personKey : undefined,
        evidence_scope: document.documentKind === 'cv' ? 'individual_private_evidence' : 'company',
      },
      content:
        document.documentKind === 'cv'
          ? redactCvContent(extractedContent, document.redaction?.literals)
          : extractedContent,
    }),
  ];
}

function validateLocalDocument(document: ILocalDocumentManifestEntry, rootDir: string): void {
  if (!document || typeof document !== 'object') {
    throw new Error('Local document entries must be objects');
  }

  for (const key of ['format', 'filePath', 'sourceKey', 'title', 'documentKind'] as const) {
    if (!document[key]) {
      throw new Error(`Local document entries require ${key}`);
    }
  }

  if (document.format !== 'pdf') {
    throw new Error(`Unsupported local document format: ${document.format}`);
  }

  if (document.documentKind === 'cv') {
    if (!document.redaction || document.redaction.profile !== 'cv' || !document.redaction.manualReview) {
      throw new Error(`CV document ${document.sourceKey} requires a manually reviewed CV redaction policy`);
    }

    if (isPathInDirectory(rootDir, document.filePath, 'public')) {
      throw new Error(`CV document ${document.sourceKey} must not be stored under public/`);
    }
  }
}
