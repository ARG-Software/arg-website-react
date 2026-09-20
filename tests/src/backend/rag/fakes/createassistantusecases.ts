import { AskAssistantQuestionUseCase } from '../../../../../src/backend/rag/application/usecases/assistant/askassistantquestion.usecase.js';
import { RetrieveRelevantChunksUseCase } from '../../../../../src/backend/rag/application/usecases/assistant/retrieverelevantchunks.usecase.js';
import { SemanticRetrievalEmbeddingPlanner } from '../../../../../src/backend/rag/application/retrievalplanning/createsemanticembeddings.js';
import { SemanticEmbeddingResolver } from '../../../../../src/backend/rag/application/retrieval/embeddingresolver.js';
import { createRoutedContextRetriever } from '../../../../../src/backend/rag/application/retrieval/createroutedcontextretriever.js';
import type { IRagConfig } from '../../../../../src/backend/rag/application/config/irag.configuration.js';
import type { IEmbeddingProvider, ILlmProvider } from '../../../../../src/backend/rag/application/ports/iproviderports.js';
import type { IRagReadRepositories } from '../../../../../src/backend/rag/application/ports/iragread.repository.js';

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
