import type { EmbeddingProvider } from '../../core/types/providers.js';
import type { EmbeddingIndex } from '../../core/types/retrieval.js';
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
  if (item.route.kind === 'latest_blog' || item.route.requiresPersonClarification) {
    return false;
  }

  if (item.route.kind === 'direct_evidence' && isExactTechnologySubject(item.plan.subject)) {
    return false;
  }

  if (
    item.route.kind === 'direct_evidence' &&
    isProjectReferenceQuestion(item.retrievalQuestion, item.plan.subject)
  ) {
    return false;
  }

  return item.route.kind === 'editorial' || Boolean(item.plan.subject);
}
