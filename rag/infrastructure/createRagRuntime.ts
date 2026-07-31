import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { deepSeekAssistantUiCopyTranslator } from '../clients/deepseekAssistantUiCopyTranslator.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type { AskQuestionInput } from '../runtime/ask/askQuestion.js';
import {
  askQuestion as askQuestionUseCase,
  retrieveRelevantChunks as retrieveRelevantChunksUseCase,
} from '../runtime/ask/askQuestion.js';
import { getAssistantUiCopy as getAssistantUiCopyUseCase } from '../runtime/assistantUiCopy/getAssistantUiCopy.js';
import { SupabaseRagReadRepository } from '../repositories/supabase/SupabaseRagReadRepository.js';

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
