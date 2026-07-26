import type { SupabaseClient } from '@supabase/supabase-js';

import {
  geminiEmbeddingClient,
  geminiFallbackEmbeddingClient,
  isGeminiEmbeddingQuotaError,
} from '../clients/gemini.js';
import { SupabaseRagSourceRepository } from '../repositories/SupabaseRagSourceRepository.js';
import type { IngestSourceInput, IngestSourceResult } from '../core/types/ingestion.js';
import { chunkText } from './processing/chunking.js';
import { createSourceHash, normalizeText } from './processing/text.js';

export async function ingestSource({
  supabase,
  source,
  dryRun = false,
  force = false,
  fallbackOnly = false,
  embeddingProvider = geminiEmbeddingClient,
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
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

  if (!fallbackOnly) {
    const contentHash = createSourceHash(source);
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

  const sourceWithChunks = { ...source, chunks };

  if (fallbackOnly) {
    const fallbackEmbeddings = await fallbackEmbeddingProvider.embedTexts(chunks);
    const result = await sourceRepository.updateFallbackEmbeddings(sourceWithChunks, fallbackEmbeddings);

    return {
      skipped: false,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      chunkCount: result.chunkCount,
    };
  }

  let primaryEmbeddings: number[][];
  try {
    primaryEmbeddings = await embeddingProvider.embedTexts(chunks);
  } catch (error) {
    if (!isGeminiEmbeddingQuotaError(error)) {
      throw error;
    }

    const fallbackEmbeddings = await fallbackEmbeddingProvider.embedTexts(chunks);
    const result = await sourceRepository.updateFallbackEmbeddings(sourceWithChunks, fallbackEmbeddings);

    return {
      skipped: false,
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      chunkCount: result.chunkCount,
    };
  }

  let fallbackEmbeddings: number[][] | null;
  try {
    fallbackEmbeddings = await fallbackEmbeddingProvider.embedTexts(chunks);
  } catch (error) {
    if (!isGeminiEmbeddingQuotaError(error)) {
      throw error;
    }

    fallbackEmbeddings = null;
  }
  const result = await sourceRepository.upsertSource(sourceWithChunks, {
    primary: primaryEmbeddings,
    fallback: fallbackEmbeddings,
  });

  return {
    skipped: false,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    chunkCount: result.chunkCount,
  };
}
