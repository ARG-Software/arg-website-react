import { getDeepSeekConfig } from '../config/env.js';
import type { AssistantUiCopyTranslator } from '../core/types/providers.js';
import { buildAssistantUiCopyTranslationPrompt } from '../prompts/assistantUiCopyTranslation.js';
import { parseTranslatedAssistantUiCopy } from '../application/assistantUiCopy/normalization.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

interface DeepSeekUiCopyTranslationResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export const deepSeekAssistantUiCopyTranslator: AssistantUiCopyTranslator = {
  async translateAssistantUiCopy(source, language) {
    const config = getDeepSeekConfig();
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.deepseekModel,
        temperature: 0,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'system',
            content: buildAssistantUiCopyTranslationPrompt(language),
          },
          {
            role: 'user',
            content: JSON.stringify(source),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Assistant UI copy translation failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as DeepSeekUiCopyTranslationResponse;
    return parseTranslatedAssistantUiCopy(data.choices?.[0]?.message?.content);
  },
};
