import type { IRagChunkReadRepository, IRagChunkWriteRepository } from '../../ports/iragchunk.repository.js';
import type { IEmbeddingProvider } from '../../ports/iproviderports.js';

const PAGE_SIZE = 100;

export interface IRebuildFallbackEmbeddingsProgress {
  chunkCount: number;
  rebuiltCount: number;
}

export interface IRebuildFallbackEmbeddingsOptions {
  onCleared?: (chunkCount: number) => void;
  onProgress?: (progress: IRebuildFallbackEmbeddingsProgress) => void;
}

export class RebuildFallbackEmbeddingsUseCase {
  constructor(
    private readonly chunkReadRepository: IRagChunkReadRepository,
    private readonly chunkWriteRepository: IRagChunkWriteRepository,
    private readonly fallbackEmbeddingProvider: IEmbeddingProvider
  ) {}

  async execute(
    options: IRebuildFallbackEmbeddingsOptions = {}
  ): Promise<IRebuildFallbackEmbeddingsProgress> {
    const chunkCount = await this.chunkReadRepository.count();

    if (chunkCount === 0) {
      return { chunkCount, rebuiltCount: 0 };
    }

    options.onCleared?.(chunkCount);
    await this.chunkWriteRepository.clearFallbackEmbeddings();

    let offset = 0;
    let rebuiltCount = 0;

    while (offset < chunkCount) {
      const chunks = await this.chunkReadRepository.listPage(offset, PAGE_SIZE);

      if (chunks.length === 0) {
        break;
      }

      const embeddings = await this.fallbackEmbeddingProvider.embedTexts(
        chunks.map(chunk => chunk.content)
      );

      await this.chunkWriteRepository.updateFallbackEmbeddings(
        chunks.map((chunk, index) => ({ id: chunk.id, embedding: embeddings[index] }))
      );

      rebuiltCount += chunks.length;
      offset += chunks.length;
      options.onProgress?.({ chunkCount, rebuiltCount });
    }

    if (rebuiltCount !== chunkCount) {
      throw new Error(`Expected to rebuild ${chunkCount} chunks, rebuilt ${rebuiltCount}`);
    }

    return { chunkCount, rebuiltCount };
  }
}
