import { getDeepSeekConfig } from '../../../config/env.js';
import type { AssistantUiCopyTranslator } from '../../../domain/providers/ProviderPorts.js';
import { buildAssistantUiCopyTranslationPrompt } from '../../../prompts/assistantUiCopyTranslation.js';
import { parseTranslatedAssistantUiCopy } from '../../../application/assistantUiCopy/normalization.js';
import { createDeepSeekChatCompletion } from './DeepSeekChatClient.js';

export const deepSeekAssistantUiCopyTranslator: AssistantUiCopyTranslator = {
  async translateAssistantUiCopy(source, language) {
    const config = getDeepSeekConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0,
      errorPrefix: 'Assistant UI copy translation failed',
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
    });

    return parseTranslatedAssistantUiCopy(data.choices?.[0]?.message?.content);
  },
};
