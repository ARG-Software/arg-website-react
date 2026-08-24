import type { IRagWriteRepository } from '../../application/ports/IRagWriteRepository.js';

export function createFakeRagWriteRepository(
  overrides: Partial<IRagWriteRepository> = {}
): IRagWriteRepository {
  return {
    getSourceContentHash: async () => null,
    upsertSource: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    updateFallbackEmbeddings: async () => ({ sourceId: 'source-id', chunkCount: 1 }),
    ...overrides,
  };
}
