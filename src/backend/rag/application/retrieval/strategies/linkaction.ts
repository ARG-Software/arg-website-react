import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository } from '../../ports/iragsource.repository.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';
import type { IRetrievalStrategy } from '../retrievalstrategy.js';

const SITE_LINKS_SOURCE_KEY = 'site-links';

export class LinkActionRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly config: IRagConfig
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'link_action';
  }

  async retrieve(): Promise<IRetrievedContext[]> {
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes: ['homepage'] });
    const source = sources.find(item => item.sourceKey === SITE_LINKS_SOURCE_KEY);

    if (!source) return [];

    const chunks = await this.chunkRepository.findFirstBySourceIds([source.id]);

    return createContextsFromFirstChunks([source], chunks, this.config.siteUrl);
  }
}
