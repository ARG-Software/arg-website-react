import type { RetrievedContext } from '../../../../domain/retrieval/RetrievedContext.js';
import type { RagReadRepository } from '../../../ports/RagReadRepository.js';

const SITE_LINKS_SOURCE_KEY = 'site-links';

export async function retrieveLinkActionContexts(
  readRepository: RagReadRepository
): Promise<RetrievedContext[]> {
  const sources = await readRepository.findSources({ sourceTypes: ['homepage'] });
  const source = sources.find(item => item.sourceKey === SITE_LINKS_SOURCE_KEY);

  return source ? readRepository.findFirstChunksForSources([source]) : [];
}
