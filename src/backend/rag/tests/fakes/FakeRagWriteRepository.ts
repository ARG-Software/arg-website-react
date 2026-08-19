import type { RagWriteRepository } from '../../application/ports/RagWriteRepository.js';

export function createFakeRagWriteRepository(
  overrides: Partial<RagWriteRepository> = {}
): RagWriteRepository {
  return {
    getSourceContentHash: async () => null,
    upsertSource: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    updateFallbackEmbeddings: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    ...overrides,
  };
}
