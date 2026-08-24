import type { IPromptMessage } from '../../../domain/conversation/IChatMessage.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export type DeepSeekChatConfig = {
  apiKey: string;
  model: string;
};

export interface IDeepSeekChatCompletionResponse {
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
  messages: IPromptMessage[];
  temperature: number;
  errorPrefix: string;
}): Promise<IDeepSeekChatCompletionResponse> {
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

  return (await response.json()) as IDeepSeekChatCompletionResponse;
}
