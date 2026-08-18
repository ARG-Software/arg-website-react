import type { RetrievedContext } from '../../../../domain/retrieval/RetrievedContext.js';
import type { RagReadRepository, RagSourceRecord } from '../../../ports/RagReadRepository.js';

export async function retrieveLatestBlogContexts(
  repository: RagReadRepository
): Promise<RetrievedContext[]> {
  const sources = await repository.findSources({ sourceTypes: ['blog_post'] });
  const newestSources = sources
    .map(source => ({ source, timestamp: getPublicationTimestamp(source.metadata) }))
    .filter(
      (item): item is { source: RagSourceRecord; timestamp: number } => item.timestamp !== null
    )
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 3)
    .map(item => item.source);

  return repository.findFirstChunksForSources(newestSources);
}

function getPublicationTimestamp(metadata: RagSourceRecord['metadata']): number | null {
  const date = metadata?.date;
  const timestamp = typeof date === 'string' ? Date.parse(date) : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}
