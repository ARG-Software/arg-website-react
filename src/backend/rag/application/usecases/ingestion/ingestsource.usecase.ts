import { isEmbeddingQuotaExceededError } from '../../ports/providererrors.js';
import type { RagChunkRecord, RagChunkUpsertRecord } from '../../ports/iragchunk.repository.js';
import type { IRagChunkReadRepository, IRagChunkWriteRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository, IRagSourceWriteRepository } from '../../ports/iragsource.repository.js';
import type { IEmbeddingProvider } from '../../ports/iproviderports.js';
import type { IChunkingConfig } from '../../config/irag.configuration.js';
import type { IIngestSourceResult } from '../../ingestion/iingestion.types.js';
import { chunkText } from '../../ingestion/processing/chunking.js';
import { createSourceHash, normalizeText } from '../../ingestion/processing/text.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';

export interface IIngestSourceInput {
  source: IRagSource;
  dryRun?: boolean;
  force?: boolean;
  fallbackOnly?: boolean;
}

interface IUpsertSourceResult {
  sourceId: string;
  chunkCount: number;
}

export class IngestSourceUseCase {
  constructor(
    private readonly sourceReadRepository: IRagSourceReadRepository,
    private readonly sourceWriteRepository: IRagSourceWriteRepository,
    private readonly chunkReadRepository: IRagChunkReadRepository,
    private readonly chunkWriteRepository: IRagChunkWriteRepository,
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly fallbackEmbeddingProvider: IEmbeddingProvider,
    private readonly chunkingConfig?: IChunkingConfig
  ) {}

  async execute({
    source,
    dryRun = false,
    force = false,
    fallbackOnly = false,
  }: IIngestSourceInput): Promise<IIngestSourceResult> {
    const content = normalizeText(source.content);
    const chunks = source.chunks ?? chunkText(content, this.chunkingConfig);

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

    const contentHash = createSourceHash(source);
    if (!fallbackOnly) {
      const existingSource = await this.sourceReadRepository.findByKey(source);

      if (!force && existingSource?.contentHash === contentHash) {
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

    if (fallbackOnly) {
      const fallbackEmbeddings = await this.embedFallback(chunks);
      const result = await this.updateFallbackEmbeddings(source, chunks, contentHash, fallbackEmbeddings);

      return toIngestResult(source, result);
    }

    let primaryEmbeddings: number[][];
    try {
      primaryEmbeddings = await this.embeddingProvider.embedTexts(chunks);
      assertEmbeddingCount('primary', chunks, primaryEmbeddings);
    } catch (error) {
      if (!isEmbeddingQuotaExceededError(error)) {
        throw error;
      }

      const fallbackEmbeddings = await this.embedFallback(chunks);
      const result = await this.updateFallbackEmbeddings(source, chunks, contentHash, fallbackEmbeddings);

      return toIngestResult(source, result);
    }

    const fallbackEmbeddings = await this.embedFallbackToleratingQuota(chunks);
    const result = await this.replaceSourceChunks(
      source,
      chunks,
      contentHash,
      primaryEmbeddings,
      fallbackEmbeddings
    );

    return toIngestResult(source, result);
  }

  private async embedFallback(chunks: string[]): Promise<number[][]> {
    const embeddings = await this.fallbackEmbeddingProvider.embedTexts(chunks);
    assertEmbeddingCount('fallback', chunks, embeddings);

    return embeddings;
  }

  private async embedFallbackToleratingQuota(chunks: string[]): Promise<number[][] | null> {
    try {
      return await this.embedFallback(chunks);
    } catch (error) {
      if (!isEmbeddingQuotaExceededError(error)) {
        throw error;
      }

      return null;
    }
  }

  private async updateFallbackEmbeddings(
    source: IIngestSourceInput['source'],
    chunks: string[],
    contentHash: string,
    embeddings: number[][]
  ): Promise<IUpsertSourceResult> {
    const existingSource = await this.sourceReadRepository.findByKey(source);
    const existingChunks = existingSource
      ? await this.chunkReadRepository.findBySourceId(existingSource.id)
      : null;

    if (!existingSource || !existingChunks || !sameChunks(existingChunks, chunks)) {
      return this.replaceSourceChunks(source, chunks, contentHash, null, embeddings);
    }

    await this.chunkWriteRepository.updateFallbackEmbeddings(
      existingChunks.map((chunk, index) => ({ id: chunk.id, embedding: embeddings[index] }))
    );

    return { sourceId: existingSource.id, chunkCount: chunks.length };
  }

  private async replaceSourceChunks(
    source: IIngestSourceInput['source'],
    chunks: string[],
    contentHash: string,
    primaryEmbeddings: number[][] | null,
    fallbackEmbeddings: number[][] | null
  ): Promise<IUpsertSourceResult> {
    const sourceId = await this.sourceWriteRepository.upsert({
      sourceType: source.sourceType,
      sourceKey: source.sourceKey,
      title: source.title,
      url: source.url ?? null,
      path: source.path ?? null,
      origin: source.origin,
      isPublic: source.isPublic,
      metadata: source.metadata ?? {},
      contentHash,
    });
    const chunkRows = createChunkRows(
      sourceId,
      source.chunkMetadata ?? {},
      chunks,
      primaryEmbeddings,
      fallbackEmbeddings
    );

    await this.chunkWriteRepository.replaceForSource(sourceId, chunkRows);

    return { sourceId, chunkCount: chunkRows.length };
  }
}

function createChunkRows(
  sourceId: string,
  chunkMetadata: Record<string, unknown>,
  chunks: string[],
  primaryEmbeddings: number[][] | null,
  fallbackEmbeddings: number[][] | null
): RagChunkUpsertRecord[] {
  return chunks.map((chunk, index) => ({
    sourceId,
    chunkIndex: index,
    content: chunk,
    embedding: primaryEmbeddings ? primaryEmbeddings[index] : null,
    fallbackEmbedding: fallbackEmbeddings ? fallbackEmbeddings[index] : null,
    metadata: {
      ...chunkMetadata,
      char_count: chunk.length,
    },
  }));
}

function sameChunks(existingChunks: RagChunkRecord[], chunks: string[]): boolean {
  return (
    existingChunks.length === chunks.length &&
    existingChunks.every((chunk, index) => chunk.chunkIndex === index && chunk.content === chunks[index])
  );
}

function toIngestResult(source: IIngestSourceInput['source'], result: IUpsertSourceResult): IIngestSourceResult {
  return {
    skipped: false,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    chunkCount: result.chunkCount,
  };
}

function assertEmbeddingCount(label: string, chunks: string[], embeddings: number[][]): void {
  if (embeddings.length !== chunks.length) {
    throw new Error(`Expected ${chunks.length} ${label} embeddings, received ${embeddings.length}`);
  }
}
