import type { RagConfig } from '../../../core/types/config.js';
import type { RetrievedContext } from '../../../core/types/context.js';
import type { EmbeddingProvider } from '../../../core/types/providers.js';
import type { EmbeddingIndex, RetrievalRoute } from '../../../core/types/retrieval.js';
import type { RagSourceType } from '../../../core/types/source.js';
import type { RagReadRepository } from '../../../repositories/RagReadRepository.js';
import { retrieveCommercialDeliveryContexts } from './strategies/commercialDelivery.js';
import { retrieveEditorialContexts } from './strategies/editorial.js';
import { retrieveLatestBlogContexts } from './strategies/latestBlog.js';
import { retrieveLinkActionContexts } from './strategies/linkAction.js';
import { retrieveOpenSourceContexts } from './strategies/openSource.js';
import { retrieveDirectEvidenceContexts } from './strategies/semanticDirectEvidence.js';

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

export interface RetrievalResult {
  contexts: RetrievedContext[];
  route: RetrievalRoute;
}

export interface RetrieveRoutedContextsInput {
  retrievalQuestion: string;
  route: RetrievalRoute;
  config: RagConfig;
  readRepository: RagReadRepository;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
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
}: RetrieveRoutedContextsInput): Promise<RetrievalResult> {
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
