import type { SupabaseClient } from '@supabase/supabase-js';

import { geminiEmbeddingClient } from '../clients/gemini.js';
import { SupabaseRagSourceRepository } from '../repositories/SupabaseRagSourceRepository.js';
import type { EmbeddingClient } from '../types/embeddings.js';
import type { IngestSourceResult, RagSource, RagSourceRepository } from '../types/ingestion.js';
import { chunkText } from './processing/chunking.js';
import { createContentHash, normalizeText } from './processing/text.js';

interface IngestSourceInput {
  supabase?: SupabaseClient | null;
  source: RagSource;
  dryRun?: boolean;
  force?: boolean;
  embeddingClient?: EmbeddingClient;
  repository?: RagSourceRepository;
}

export async function ingestSource({
  supabase,
  source,
  dryRun = false,
  force = false,
  embeddingClient = geminiEmbeddingClient,
  repository,
}: IngestSourceInput): Promise<IngestSourceResult> {
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

  if (!repository && !supabase) {
    throw new Error('A RAG source repository or Supabase client is required for ingestion checks');
  }

  const sourceRepository = repository ?? new SupabaseRagSourceRepository(supabase as SupabaseClient);

  const contentHash = createContentHash(content);
  const existingContentHash = await sourceRepository.getSourceContentHash(source);

  if (!force && existingContentHash === contentHash) {
    return {
      skipped: true,
      dryRun,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      chunkCount: chunks.length,
      reason: 'unchanged_content',
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

  const embeddings = await embeddingClient.embedTexts(chunks);
  const result = await sourceRepository.upsertSource(
    {
      ...source,
      chunks,
    },
    embeddings
  );

  return {
    skipped: false,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    chunkCount: result.chunkCount,
  };
}
