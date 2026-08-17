import type { DeepSeekConfig } from './deepSeekConfig.js';
import type { PromptMessage } from '../../../domain/conversation/ChatMessage.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export type DeepSeekChatConfig = DeepSeekConfig;

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
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
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
