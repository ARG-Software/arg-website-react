import { deepSeekAnswerClient } from './llm/deepseek/DeepSeekAnswerProvider.js';
import { deepSeekAssistantUiCopyTranslator } from './llm/deepseek/DeepSeekAssistantUiCopyTranslator.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from './embeddings/gemini/GeminiEmbeddingProvider.js';
import { createSupabaseServiceClient } from './db/supabase/SupabaseClientFactory.js';
import { getRagConfig } from '../config/env.js';
import type { AskQuestionInput } from '../runtime/ask/askQuestion.js';
import {
  askQuestion as askQuestionUseCase,
  retrieveRelevantChunks as retrieveRelevantChunksUseCase,
} from '../runtime/ask/askQuestion.js';
import { getAssistantUiCopy as getAssistantUiCopyUseCase } from '../runtime/assistantUiCopy/getAssistantUiCopy.js';
import { SupabaseRagReadRepository } from './db/supabase/SupabaseRagReadRepository.js';

export function createRagRuntime() {
  const config = getRagConfig();
  const readRepository = new SupabaseRagReadRepository(
    createSupabaseServiceClient(config),
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
