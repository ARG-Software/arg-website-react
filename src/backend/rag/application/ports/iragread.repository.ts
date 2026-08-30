import type { IRagChunkReadRepository } from './iragchunk.repository.js';
import type { IRagChunkSearchRepository } from './iragchunksearch.repository.js';
import type { IRagSourceReadRepository } from './iragsource.repository.js';

export interface IRagReadRepositories {
  sourceRepository: IRagSourceReadRepository;
  chunkRepository: IRagChunkReadRepository;
  chunkSearchRepository: IRagChunkSearchRepository;
}
