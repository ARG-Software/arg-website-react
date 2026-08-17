import type { IngestSourceInput, IngestSourceResult } from './types.js';
import { isEmbeddingQuotaExceededError } from '../ports/ProviderErrors.js';
import { chunkText } from './processing/chunking.js';
import { createSourceHash, normalizeText } from './processing/text.js';

export async function ingestSource({
  source,
  dryRun = false,
  force = false,
  fallbackOnly = false,
  chunkingConfig,
  embeddingProvider,
  fallbackEmbeddingProvider,
  repository: sourceRepository,
}: IngestSourceInput): Promise<IngestSourceResult> {
  const primaryProvider = requireDependency(embeddingProvider, 'embedding provider');
  const fallbackProvider = requireDependency(fallbackEmbeddingProvider, 'fallback embedding provider');
  const content = normalizeText(source.content);
  const chunks = chunkText(content, chunkingConfig);

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
    const fallbackEmbeddings = await fallbackProvider.embedTexts(chunks);
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
    primaryEmbeddings = await primaryProvider.embedTexts(chunks);
  } catch (error) {
    if (!isEmbeddingQuotaExceededError(error)) {
      throw error;
    }

    const fallbackEmbeddings = await fallbackProvider.embedTexts(chunks);
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
    fallbackEmbeddings = await fallbackProvider.embedTexts(chunks);
  } catch (error) {
    if (!isEmbeddingQuotaExceededError(error)) {
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

function requireDependency<T>(dependency: T | undefined, label: string): T {
  if (!dependency) {
    throw new Error(`${label} is required`);
  }

  return dependency;
}
