import type { IRetrievedContext } from '../../../../domain/retrieval/iretrievedcontext.js';
import type { IRagReadRepository, IRagSourceRecord } from '../../../ports/iragread.repository.js';

export async function retrieveLatestBlogContexts(
  repository: IRagReadRepository
): Promise<IRetrievedContext[]> {
  const sources = await repository.findSources({ sourceTypes: ['blog_post'] });
  const newestSources = sources
    .map(source => ({ source, timestamp: getPublicationTimestamp(source.metadata) }))
    .filter(
      (item): item is { source: IRagSourceRecord; timestamp: number } => item.timestamp !== null
    )
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 3)
    .map(item => item.source);

  return repository.findFirstChunksForSources(newestSources);
}

function getPublicationTimestamp(metadata: IRagSourceRecord['metadata']): number | null {
  const date = metadata?.date;
  const timestamp = typeof date === 'string' ? Date.parse(date) : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}
