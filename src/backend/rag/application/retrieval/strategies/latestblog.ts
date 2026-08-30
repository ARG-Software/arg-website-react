import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository } from '../../ports/iragsource.repository.js';
import type { RagSourceRecord } from '../../ports/iragsource.repository.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';
import type { IRetrievalStrategy } from '../retrievalstrategy.js';

export class LatestBlogRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly config: IRagConfig
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'blog' && route.blogKind === 'latest';
  }

  async retrieve(): Promise<IRetrievedContext[]> {
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes: ['blog_post'] });
    const newestSources = sources
      .map(source => ({ source, timestamp: getPublicationTimestamp(source.metadata) }))
      .filter(
        (item): item is { source: RagSourceRecord; timestamp: number } => item.timestamp !== null
      )
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 3)
      .map(item => item.source);

    const chunks = await this.chunkRepository.findFirstBySourceIds(newestSources.map(source => source.id));

    return createContextsFromFirstChunks(newestSources, chunks, this.config.siteUrl);
  }
}

function getPublicationTimestamp(metadata: RagSourceRecord['metadata']): number | null {
  const date = metadata?.date;
  const timestamp = typeof date === 'string' ? Date.parse(date) : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}
