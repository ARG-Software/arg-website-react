import { getDeepSeekConfig, type DeepSeekConfig } from './deepSeekConfig.js';
import type { AssistantUiCopyTranslator } from '../../../application/ports/ProviderPorts.js';
import { buildAssistantUiCopyTranslationPrompt } from '../../../application/prompts/assistantUiCopyTranslation.js';
import { parseTranslatedAssistantUiCopy } from '../../../application/assistantUiCopy/normalization.js';
import { createDeepSeekChatCompletion } from './DeepSeekChatClient.js';

export function createDeepSeekAssistantUiCopyTranslator(
  config: DeepSeekConfig = getDeepSeekConfig()
): AssistantUiCopyTranslator {
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
