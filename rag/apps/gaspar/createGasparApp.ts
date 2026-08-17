import { deepSeekAnswerClient } from '../../infrastructure/llm/deepseek/DeepSeekAnswerProvider.js';
import { deepSeekAssistantUiCopyTranslator } from '../../infrastructure/llm/deepseek/DeepSeekAssistantUiCopyTranslator.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import { getRagConfig } from '../../application/ragConfig.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/SupabaseRagReadRepository.js';
import type { AskQuestionInput } from '../../application/ask/askQuestion.js';
import {
  askQuestion as askQuestionUseCase,
  retrieveRelevantChunks as retrieveRelevantChunksUseCase,
} from '../../application/ask/askQuestion.js';
import { getAssistantUiCopy as getAssistantUiCopyUseCase } from '../../application/assistantUiCopy/getAssistantUiCopy.js';

export function createGasparApp() {
  const config = getRagConfig();
  const readRepository = new SupabaseRagReadRepository(
    createSupabaseServiceClient(),
    config.siteUrl
  );
  const dependencies = {
    config,
    readRepository,
    answerProvider: deepSeekAnswerClient,
    embeddingProvider: geminiEmbeddingClient,
    fallbackEmbeddingProvider: geminiFallbackEmbeddingClient,
  };

  return {
    askQuestion(input: AskQuestionInput = {}) {
      return askQuestionUseCase({ ...dependencies, ...input });
    },
    retrieveRelevantChunks(input: AskQuestionInput = {}) {
      return retrieveRelevantChunksUseCase({ ...dependencies, ...input });
    },
    getAssistantUiCopy(language: string | undefined) {
      return getAssistantUiCopyUseCase(language, { translator: deepSeekAssistantUiCopyTranslator });
    },
  };
}
