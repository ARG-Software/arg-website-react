import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { EmbeddingIndex } from '../../domain/sources/ragsource.types.js';
import type { IRetrievalRoute } from '../../domain/routing/retrievalroute.types.js';
import type { IRetrievalStrategy } from './retrievalstrategy.js';

export interface IRetrievalResult {
  contexts: IRetrievedContext[];
  route: IRetrievalRoute;
}

export interface IRetrieveRoutedContextsInput {
  retrievalQuestion: string;
  route: IRetrievalRoute;
  embedding?: number[];
  index?: EmbeddingIndex;
}

export class RoutedContextRetriever {
  constructor(private readonly strategies: IRetrievalStrategy[]) {}

  async retrieve({
    retrievalQuestion,
    route,
    embedding,
    index,
  }: IRetrieveRoutedContextsInput): Promise<IRetrievalResult> {
    const semanticSearch = embedding && index ? { query: retrievalQuestion, embedding, index } : undefined;
    const strategy = this.strategies.find(item => item.canRetrieve(route));

    if (!strategy) {
      return { contexts: [], route };
    }

    return {
      contexts: await strategy.retrieve({ retrievalQuestion, route, semanticSearch }),
      route,
    };
  }
}
