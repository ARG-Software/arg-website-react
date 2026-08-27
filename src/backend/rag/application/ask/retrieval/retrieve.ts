import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/retrieval/iretrievedcontext.js';
import type { IEmbeddingProvider } from '../../ports/iproviderports.js';
import type { EmbeddingIndex } from '../../ports/embeddingindex.js';
import type { IRetrievalRoute } from '../../../domain/retrieval/iretrievalroute.js';
import type { RagSourceType } from '../../../domain/content/iragsource.js';
import type { IRagReadRepository } from '../../ports/iragread.repository.js';
import { retrieveCommercialDeliveryContexts } from './strategies/commercialdelivery.js';
import { retrieveEditorialContexts } from './strategies/editorial.js';
import { retrieveLatestBlogContexts } from './strategies/latestblog.js';
import { retrieveLinkActionContexts } from './strategies/linkaction.js';
import { retrieveOpenSourceContexts } from './strategies/opensource.js';
import { retrieveDirectEvidenceContexts } from './strategies/semanticdirectevidence.js';

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

export interface IRetrievalResult {
  contexts: IRetrievedContext[];
  route: IRetrievalRoute;
}

export interface IRetrieveRoutedContextsInput {
  retrievalQuestion: string;
  route: IRetrievalRoute;
  config: IRagConfig;
  readRepository: IRagReadRepository;
  embeddingProvider: IEmbeddingProvider;
  fallbackEmbeddingProvider: IEmbeddingProvider;
  embedding?: number[];
  index?: EmbeddingIndex;
}

export async function retrieveRoutedContexts({
  retrievalQuestion,
  route,
  config,
  readRepository,
  embeddingProvider,
  fallbackEmbeddingProvider,
  embedding,
  index,
}: IRetrieveRoutedContextsInput): Promise<IRetrievalResult> {
  if (route.kind === 'blog' && route.blogKind === 'latest') {
    return {
      contexts: await retrieveLatestBlogContexts(readRepository),
      route,
    };
  }

  const semanticSearch = embedding && index ? { query: retrievalQuestion, embedding, index } : undefined;

  if (route.forceFirstChunks && route.sourceKeys?.length) {
    const sourceTypes = route.firstPartySourceTypes ?? CONTEXT_SOURCE_TYPES;
    const sources = await readRepository.findSources({ sourceTypes });
    const sourceKeys = new Set(route.sourceKeys);
    return {
      contexts: await readRepository.findFirstChunksForSources(
        sources.filter(source => sourceKeys.has(source.sourceKey))
      ),
      route,
    };
  }

  if (route.kind === 'link_action') {
    return {
      contexts: await retrieveLinkActionContexts(readRepository),
      route,
    };
  }

  if (route.kind === 'commercial_delivery') {
    return {
      contexts: await retrieveCommercialDeliveryContexts({ readRepository, config, route }),
      route,
    };
  }

  if (route.kind === 'open_source') {
    return {
      contexts: await retrieveOpenSourceContexts({
        readRepository,
        config,
        retrievalQuestion,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch,
      }),
      route,
    };
  }

  if (route.kind !== 'blog') {
    return {
      contexts: await retrieveDirectEvidenceContexts({
        readRepository,
        config,
        retrievalQuestion,
        route,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch,
      }),
      route,
    };
  }

  return {
    contexts: await retrieveEditorialContexts({
      retrievalQuestion,
      route,
      config,
      readRepository,
      embeddingProvider,
      fallbackEmbeddingProvider,
      semanticSearch,
    }),
    route,
  };
}
