import type { IAssistantUiCopyTranslator } from '../../../application/ports/IProviderPorts.js';
import { buildAssistantUiCopyTranslationPrompt } from '../../../application/prompts/assistantUiCopyTranslation.js';
import { parseTranslatedAssistantUiCopy } from '../../../application/assistantUiCopy/normalization.js';
import { createDeepSeekChatCompletion } from './DeepSeekChatClient.js';

type DeepSeekTranslatorConfig = {
  apiKey: string;
  model: string;
};

export function createDeepSeekAssistantUiCopyTranslator(
  config: DeepSeekTranslatorConfig
): IAssistantUiCopyTranslator {
  return {
    async translateAssistantUiCopy(source, language) {
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
}
