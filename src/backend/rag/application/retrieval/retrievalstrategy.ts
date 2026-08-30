import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../domain/routing/retrievalroute.types.js';
import type { ISemanticSearchInput } from './embeddingresolver.js';

export interface IRetrievalStrategyInput {
  retrievalQuestion: string;
  route: IRetrievalRoute;
  semanticSearch?: ISemanticSearchInput;
}

export interface IRetrievalStrategy {
  canRetrieve(route: IRetrievalRoute): boolean;
  retrieve(input: IRetrievalStrategyInput): Promise<IRetrievedContext[]>;
}
