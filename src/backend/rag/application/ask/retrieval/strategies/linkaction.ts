import type { IRetrievedContext } from '../../../../domain/retrieval/iretrievedcontext.js';
import type { IRagReadRepository } from '../../../ports/iragread.repository.js';

const SITE_LINKS_SOURCE_KEY = 'site-links';

export async function retrieveLinkActionContexts(
  readRepository: IRagReadRepository
): Promise<IRetrievedContext[]> {
  const sources = await readRepository.findSources({ sourceTypes: ['homepage'] });
  const source = sources.find(item => item.sourceKey === SITE_LINKS_SOURCE_KEY);

  return source ? readRepository.findFirstChunksForSources([source]) : [];
}
