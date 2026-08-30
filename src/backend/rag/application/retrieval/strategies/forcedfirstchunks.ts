import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { RagSourceType } from '../../../domain/sources/ragsource.types.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository } from '../../ports/iragsource.repository.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';

const CONTEXT_SOURCE_TYPES: RagSourceType[] = [
  'homepage',
  'about',
  'project',
  'partner',
  'careers',
  'working_with_us',
  'faq',
  'blog_post',
];

export class ForcedFirstChunksRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly config: IRagConfig
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return Boolean(route.forceFirstChunks && route.sourceKeys?.length);
  }

  async retrieve({ route }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    const sourceTypes = route.firstPartySourceTypes ?? CONTEXT_SOURCE_TYPES;
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes });
    const sourceKeys = new Set(route.sourceKeys);
    const selectedSources = sources.filter(source => sourceKeys.has(source.sourceKey));
    const chunks = await this.chunkRepository.findFirstBySourceIds(
      selectedSources.map(source => source.id)
    );

    return createContextsFromFirstChunks(selectedSources, chunks, this.config.siteUrl);
  }
}
