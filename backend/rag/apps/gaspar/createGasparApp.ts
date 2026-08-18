import { DeepSeekAnswerClient } from '../../infrastructure/llm/deepseek/DeepSeekAnswerProvider.js';
import { createDeepSeekAssistantUiCopyTranslator } from '../../infrastructure/llm/deepseek/DeepSeekAssistantUiCopyTranslator.js';
import { GeminiEmbeddingClient } from '../../infrastructure/embeddings/gemini/GeminiEmbeddingProvider.js';
import { getRagConfig } from '../../application/ragConfig.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { SupabaseRagReadRepository } from '../../infrastructure/repositories/supabase/SupabaseRagReadRepository.js';
import type { AskQuestionInput } from '../../application/ask/askQuestion.js';
import {
  askQuestion as askQuestionUseCase,
  retrieveRelevantChunks as retrieveRelevantChunksUseCase,
} from '../../application/ask/askQuestion.js';
import { getAssistantUiCopy as getAssistantUiCopyUseCase } from '../../application/assistantUiCopy/getAssistantUiCopy.js';
import { getSupabaseConfig } from '../../infrastructure/repositories/supabase/supabaseConfig.js';
import {
  getGeminiConfig,
  getGeminiFallbackEmbeddingConfig,
} from '../../infrastructure/embeddings/gemini/geminiConfig.js';
import { getDeepSeekConfig } from '../../infrastructure/llm/deepseek/deepSeekConfig.js';
import type { EnvSource } from '../../config/env.js';

interface GasparAppOptions {
  env?: EnvSource;
}

export function createGasparApp({ env = process.env }: GasparAppOptions = {}) {
  const config = getRagConfig(env);
  const deepSeekConfig = getDeepSeekConfig(env);
  const readRepository = new SupabaseRagReadRepository(
    createSupabaseServiceClient(getSupabaseConfig(env)),
    config.siteUrl
  );
  const dependencies = {
    config,
    readRepository,
    answerProvider: new DeepSeekAnswerClient({
      ...deepSeekConfig,
      companyName: config.companyName,
    }),
    embeddingProvider: new GeminiEmbeddingClient(() => getGeminiConfig(env)),
    fallbackEmbeddingProvider: new GeminiEmbeddingClient(() =>
      getGeminiFallbackEmbeddingConfig(env)
    ),
  };

  return {
    askQuestion(input: AskQuestionInput = {}) {
      return askQuestionUseCase({ ...dependencies, ...input });
    },
    retrieveRelevantChunks(input: AskQuestionInput = {}) {
      return retrieveRelevantChunksUseCase({ ...dependencies, ...input });
    },
    getAssistantUiCopy(language: string | undefined) {
      return getAssistantUiCopyUseCase(language, {
        translator: createDeepSeekAssistantUiCopyTranslator(deepSeekConfig),
      });
    },
  };
}
