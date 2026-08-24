import type { IRetrievedContext } from '../../../../domain/retrieval/IRetrievedContext.js';
import type { IRagReadRepository } from '../../../ports/IRagReadRepository.js';

const SITE_LINKS_SOURCE_KEY = 'site-links';

export async function retrieveLinkActionContexts(
  readRepository: IRagReadRepository
): Promise<IRetrievedContext[]> {
  const sources = await readRepository.findSources({ sourceTypes: ['homepage'] });
  const source = sources.find(item => item.sourceKey === SITE_LINKS_SOURCE_KEY);

  return source ? readRepository.findFirstChunksForSources([source]) : [];
}
