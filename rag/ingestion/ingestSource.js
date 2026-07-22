import { embedTextsInBatches } from '../clients/gemini.js';
import { chunkText } from './processing/chunking.js';
import { normalizeText } from './processing/text.js';
import { upsertRagSource } from './processing/upsert.js';

export async function ingestSource({ supabase, source, dryRun = false }) {
  const content = normalizeText(source.content);
  const chunks = chunkText(content);

  if (chunks.length === 0) {
    return {
      skipped: true,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      chunkCount: 0,
      reason: 'empty_content',
    };
  }

  if (dryRun) {
    return {
      skipped: false,
      dryRun: true,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      chunkCount: chunks.length,
    };
  }

  const embeddings = await embedTextsInBatches(chunks);
  const result = await upsertRagSource({
    supabase,
    source: {
      ...source,
      chunks,
    },
    embeddings,
  });

  return {
    skipped: false,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    chunkCount: result.chunkCount,
  };
}
