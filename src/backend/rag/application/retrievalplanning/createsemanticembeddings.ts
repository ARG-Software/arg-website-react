import type { EmbeddingIndex } from '../../domain/sources/ragsource.types.js';
import type { IRoutedRetrievalItem } from '../../domain/routing/retrievalitems.js';
import { isExactTechnologySubject } from '../../domain/claims/technologyclaims.js';
import { isProjectReferenceQuestion } from '../../domain/claims/projectreferenceclaims.js';
import { SemanticEmbeddingResolver } from '../retrieval/embeddingresolver.js';

export class SemanticRetrievalEmbeddingPlanner {
  constructor(private readonly embeddingResolver: SemanticEmbeddingResolver) {}

  async createEmbeddings(
    items: IRoutedRetrievalItem[]
  ): Promise<Map<number, { embedding: number[]; index: EmbeddingIndex }>> {
    const semanticItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => requiresSemanticEmbedding(item));

    if (semanticItems.length === 0) {
      return new Map();
    }

    const { embeddings, index: embeddingIndex } = await this.embeddingResolver.createEmbeddings(
      semanticItems.map(({ item }) => item.retrievalQuestion)
    );

    return new Map(
      semanticItems.flatMap(({ index }, batchIndex) => {
        const embedding = embeddings[batchIndex];
        return embedding ? [[index, { embedding, index: embeddingIndex }]] : [];
      })
    );
  }
}

function requiresSemanticEmbedding(item: IRoutedRetrievalItem): boolean {
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
