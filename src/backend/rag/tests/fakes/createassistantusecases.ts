import { AskAssistantQuestionUseCase } from '../../application/usecases/assistant/askassistantquestion.usecase.js';
import { RetrieveRelevantChunksUseCase } from '../../application/usecases/assistant/retrieverelevantchunks.usecase.js';
import { SemanticRetrievalEmbeddingPlanner } from '../../application/retrievalplanning/createsemanticembeddings.js';
import { SemanticEmbeddingResolver } from '../../application/retrieval/embeddingresolver.js';
import { createRoutedContextRetriever } from '../../application/retrieval/createroutedcontextretriever.js';
import type { IRagConfig } from '../../application/config/irag.configuration.js';
import type { IEmbeddingProvider, ILlmProvider } from '../../application/ports/iproviderports.js';
import type { IRagReadRepositories } from '../../application/ports/iragread.repository.js';

export interface TestAssistantUseCaseInput {
  config: IRagConfig;
  readRepository: IRagReadRepositories;
  answerProvider: ILlmProvider;
  embeddingProvider: IEmbeddingProvider;
  fallbackEmbeddingProvider: IEmbeddingProvider;
}

export function createAssistantUseCases(input: TestAssistantUseCaseInput) {
  const embeddingResolver = new SemanticEmbeddingResolver(
    input.embeddingProvider,
    input.fallbackEmbeddingProvider
  );
  const routedContextRetriever = createRoutedContextRetriever({
    sourceRepository: input.readRepository.sourceRepository,
    chunkRepository: input.readRepository.chunkRepository,
    chunkSearchRepository: input.readRepository.chunkSearchRepository,
    config: input.config,
    embeddingResolver,
  });

  return {
    askAssistantQuestionUseCase: new AskAssistantQuestionUseCase(
      input.config,
      input.answerProvider,
      new SemanticRetrievalEmbeddingPlanner(embeddingResolver),
      routedContextRetriever
    ),
    retrieveRelevantChunksUseCase: new RetrieveRelevantChunksUseCase(
      input.answerProvider,
      routedContextRetriever
    ),
  };
}
