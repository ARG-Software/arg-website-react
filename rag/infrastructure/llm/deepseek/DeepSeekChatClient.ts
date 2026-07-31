import type { RagConfig } from '../../../core/types/config.js';
import type { PromptMessage } from '../../../domain/conversation/ChatMessage.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export type DeepSeekChatConfig = Pick<RagConfig, 'deepseekApiKey' | 'deepseekModel'>;

export interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function createDeepSeekChatCompletion({
  config,
  messages,
  temperature,
  errorPrefix,
}: {
  config: DeepSeekChatConfig;
  messages: PromptMessage[];
  temperature: number;
  errorPrefix: string;
}): Promise<DeepSeekChatCompletionResponse> {
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      temperature,
      messages,
      thinking: { type: 'disabled' },
    }),
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as DeepSeekChatCompletionResponse;
}
