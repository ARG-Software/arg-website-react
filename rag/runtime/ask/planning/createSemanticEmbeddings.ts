import type { EmbeddingProvider } from '../../../domain/providers/ProviderPorts.js';
import type { EmbeddingIndex } from '../../../domain/providers/EmbeddingIndex.js';
import { createQueryEmbeddings } from '../retrieval/embeddings.js';
import { isExactTechnologySubject } from '../retrieval/strategies/exactTechnology.js';
import { isProjectReferenceQuestion } from '../retrieval/strategies/projectReferences.js';
import type { RoutedRetrievalItem } from './createRetrievalItems.js';

export async function createSemanticEmbeddings(
  items: RoutedRetrievalItem[],
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<Map<number, { embedding: number[]; index: EmbeddingIndex }>> {
  const semanticItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => requiresSemanticEmbedding(item));

  if (semanticItems.length === 0) {
    return new Map();
  }

  const { embeddings, index: embeddingIndex } = await createQueryEmbeddings(
    semanticItems.map(({ item }) => item.retrievalQuestion),
    embeddingProvider,
    fallbackEmbeddingProvider
  );

  return new Map(
    semanticItems.flatMap(({ index }, batchIndex) => {
      const embedding = embeddings[batchIndex];
      return embedding ? [[index, { embedding, index: embeddingIndex }]] : [];
    })
  );
}

function requiresSemanticEmbedding(item: RoutedRetrievalItem): boolean {
  if (item.route.requiresPersonClarification) {
    return false;
  }

  if (item.route.kind === 'blog' && item.route.blogKind === 'latest') {
    return false;
  }

  if (item.route.kind === 'commercial_delivery' || item.route.kind === 'link_action') {
    return false;
  }

  if (item.route.forceFirstChunks) {
    return false;
  }

  if (isExactTechnologySubject(item.plan.subject)) {
    return false;
  }

  if (
    item.route.kind !== 'blog' &&
    isProjectReferenceQuestion(item.retrievalQuestion, item.plan.subject)
  ) {
    return false;
  }

  return item.route.kind === 'blog' || Boolean(item.plan.subject);
}
