import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingProvider, RetrievedContext } from '../../types/ai.js';
import type { RagConfig } from '../../types/config.js';
import { createQueryEmbedding } from './embeddings.js';
import { retrieveDirectEvidenceContexts } from './directEvidence.js';
import { retrieveLatestBlogContexts } from './latestBlog.js';
import type { RetrievalRoute } from './route.js';
import type { MatchFunction } from './types.js';
import { retrieveContextsForOrigin } from './vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';

export interface RetrievalResult {
  contexts: RetrievedContext[];
  route: RetrievalRoute;
}

export async function retrieveRoutedContexts({
  retrievalQuestion,
  route,
  config,
  supabase,
  embeddingProvider,
  fallbackEmbeddingProvider,
  embedding,
  matchFunction,
}: {
  retrievalQuestion: string;
  route: RetrievalRoute;
  config: RagConfig;
  supabase: SupabaseClient;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  embedding?: number[];
  matchFunction?: MatchFunction;
}): Promise<RetrievalResult> {
  if (route.kind === 'latest_blog') {
    return {
      contexts: await retrieveLatestBlogContexts(supabase, config),
      route,
    };
  }

  if (route.kind === 'direct_evidence') {
    return {
      contexts: await retrieveDirectEvidenceContexts({
        supabase,
        config,
        route,
        embeddingProvider,
        fallbackEmbeddingProvider,
        semanticSearch:
          embedding && matchFunction
            ? { query: retrievalQuestion, embedding, matchFunction }
            : undefined,
      }),
      route,
    };
  }

  const semanticSearch =
    embedding && matchFunction
      ? { embedding, matchFunction }
      : await createQueryEmbedding(retrievalQuestion, embeddingProvider, fallbackEmbeddingProvider);
  const firstPartyContexts = await retrieveContextsForOrigin({
    supabase,
    embedding: semanticSearch.embedding,
    config,
    matchFunction: semanticSearch.matchFunction,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: route.firstPartySourceTypes,
  });

  return {
    contexts: firstPartyContexts,
    route,
  };
}
