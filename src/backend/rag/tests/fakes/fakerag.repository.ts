import type {
  IRagChunkReadRepository,
  IRagChunkWriteRepository,
} from '../../application/ports/iragchunk.repository.js';
import type {
  IRagSourceReadRepository,
  IRagSourceWriteRepository,
} from '../../application/ports/iragsource.repository.js';

export interface IFakeRagRepositories {
  sourceRepository: IRagSourceReadRepository & IRagSourceWriteRepository;
  chunkRepository: IRagChunkReadRepository & IRagChunkWriteRepository;
}

export function createFakeRagRepositories(
  overrides: {
    sourceRepository?: Partial<IRagSourceReadRepository & IRagSourceWriteRepository>;
    chunkRepository?: Partial<IRagChunkReadRepository & IRagChunkWriteRepository>;
  } = {}
): IFakeRagRepositories {
  return {
    sourceRepository: {
      findByKey: async () => null,
      findPublicByTypes: async () => [],
      upsert: async () => 'source-id',
      ...overrides.sourceRepository,
    },
    chunkRepository: {
      findBySourceId: async () => [],
      findFirstBySourceIds: async () => [],
      count: async () => 0,
      listPage: async () => [],
      replaceForSource: async () => {},
      clearFallbackEmbeddings: async () => {},
      updateFallbackEmbeddings: async () => {},
      ...overrides.chunkRepository,
    },
  };
}
