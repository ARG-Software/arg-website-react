import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { ILlmProvider } from '../../../application/ports/iproviderports.js';
import { parseTranslatedAssistantUiCopy } from '../../../application/assistantcopy/normalization.js';
import { buildAssistantUiCopyTranslationPrompt } from '../../../application/llm/prompts/assistantuicopytranslation.js';
import { buildSystemPrompt } from '../../../application/llm/prompts/answering.js';
import {
  buildConversationTransformPrompt,
  buildConversationTransformUserPrompt,
} from '../../../application/llm/prompts/conversationtransform.js';
import { buildIntentFallbackPrompt } from '../../../application/llm/prompts/fallback.js';
import { buildInsufficientContextPrompt } from '../../../application/llm/prompts/insufficientcontext.js';
import { buildIntentPrompt } from '../../../application/llm/prompts/intent.js';
import {
  buildHistoryMessages,
  buildPageContextMessages,
  buildUserPrompt,
} from '../../../application/llm/prompts/messageformatting.js';
import { buildPersonClarificationPrompt } from '../../../application/llm/prompts/personclarification.js';
import { buildRetrievalPlanPrompt } from '../../../application/llm/prompts/retrievalplan.js';
import { parseIntentResponse, parseRetrievalPlan } from '../../../application/llm/outputparsers.js';
import type { IPromptMessage } from '../../../application/llm/promptmessage.types.js';
import type { IAssistantUiCopy } from '../../../domain/assistant/assistantcopy.types.js';
import type { IChatMessage } from '../../../domain/conversation/chatmessage.types.js';
import type { ConversationTransformTask } from '../../../domain/conversation/conversationtransform.types.js';
import type { IPageContext } from '../../../domain/conversation/pagecontext.types.js';
import type {
  FallbackQuestionIntent,
  IQuestionIntentResult,
} from '../../../domain/conversation/questionintent.types.js';
import type { IRetrievalPlan } from '../../../domain/routing/retrievalplan.types.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

type DeepSeekConfig = {
  apiKey: string;
  model: string;
  companyName: string;
};

interface IDeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class DeepSeekClient implements ILlmProvider {
  constructor(private readonly config: DeepSeekConfig, private readonly logger?: ILogger) {}

  async generateAnswer(
    question: string,
    messages: IChatMessage[],
    contexts: IRetrievedContext[],
    responseLanguage: string
  ): Promise<string> {
    const content = await this.chat(
      'DeepSeek answer request',
      'DeepSeek answer request failed',
      [
        { role: 'system', content: buildSystemPrompt(this.config.companyName, responseLanguage) },
        ...buildHistoryMessages(messages),
        { role: 'user', content: buildUserPrompt(question, contexts) },
      ],
      0.2,
      {
        contextCount: contexts.length,
        historyMessageCount: messages.length,
        responseLanguage,
      }
    );

    return content?.trim() ?? '';
  }

  async planRetrieval(
    question: string,
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IRetrievalPlan> {
    const content = await this.chat(
      'DeepSeek retrieval-plan request',
      'DeepSeek retrieval-plan request failed',
      [
        { role: 'system', content: buildRetrievalPlanPrompt() },
        ...buildPageContextMessages(pageContext),
        ...buildHistoryMessages(messages),
        { role: 'user', content: question },
      ],
      0,
      {
        hasPageContext: Boolean(pageContext),
        historyMessageCount: messages.length,
      }
    );

    return parseRetrievalPlan(content);
  }

  async classifyQuestionIntent(
    question: string,
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IQuestionIntentResult> {
    const content = await this.chat(
      'DeepSeek intent classification request',
      'DeepSeek intent classification request failed',
      [
        { role: 'system', content: buildIntentPrompt(this.config.companyName) },
        ...buildPageContextMessages(pageContext),
        ...buildHistoryMessages(messages),
        { role: 'user', content: question },
      ],
      0,
      {
        hasPageContext: Boolean(pageContext),
        historyMessageCount: messages.length,
      }
    );

    return parseIntentResponse(content);
  }

  async generateInsufficientContextAnswer(
    question: string,
    messages: IChatMessage[],
    responseLanguage: string
  ): Promise<string> {
    const content = await this.chat(
      'DeepSeek insufficient-context response request',
      'DeepSeek insufficient context response request failed',
      [
        {
          role: 'system',
          content: buildInsufficientContextPrompt(this.config.companyName, responseLanguage),
        },
        ...buildHistoryMessages(messages),
        { role: 'user', content: question },
      ],
      0.2,
      {
        historyMessageCount: messages.length,
        responseLanguage,
      }
    );

    return content?.trim() ?? '';
  }

  async generateIntentFallbackResponse(
    question: string,
    intent: FallbackQuestionIntent,
    responseLanguage: string
  ): Promise<string> {
    const content = await this.chat(
      'DeepSeek intent fallback response request',
      'DeepSeek intent fallback response request failed',
      [
        {
          role: 'system',
          content: buildIntentFallbackPrompt(this.config.companyName, intent, responseLanguage),
        },
        { role: 'user', content: question },
      ],
      0.2,
      { intent, responseLanguage }
    );

    return content?.trim() ?? '';
  }

  async generatePersonClarification(question: string, responseLanguage: string): Promise<string> {
    const content = await this.chat(
      'DeepSeek person clarification request',
      'DeepSeek person clarification response request failed',
      [
        { role: 'system', content: buildPersonClarificationPrompt(responseLanguage) },
        { role: 'user', content: question },
      ],
      0.2,
      { responseLanguage }
    );

    return content?.trim() ?? '';
  }

  async rewritePreviousAnswer(
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask,
    responseLanguage: string
  ): Promise<string> {
    const content = await this.chat(
      'DeepSeek conversation transform request',
      'DeepSeek conversation transform request failed',
      [
        { role: 'system', content: buildConversationTransformPrompt(task, responseLanguage) },
        { role: 'user', content: buildConversationTransformUserPrompt(instruction, previousAnswer) },
      ],
      0.2,
      { task, responseLanguage }
    );

    return content?.trim() ?? '';
  }

  async translateAssistantUiCopy(
    source: IAssistantUiCopy,
    language: string
  ): Promise<Partial<IAssistantUiCopy>> {
    const content = await this.chat(
      'DeepSeek assistant UI copy translation request',
      'Assistant UI copy translation failed',
      [
        {
          role: 'system',
          content: buildAssistantUiCopyTranslationPrompt(language),
        },
        {
          role: 'user',
          content: JSON.stringify(source),
        },
      ],
      0,
      { language }
    );

    return parseTranslatedAssistantUiCopy(content);
  }

  private async chat(
    operation: string,
    errorPrefix: string,
    messages: IPromptMessage[],
    temperature: number,
    extraLogData: Record<string, unknown> = {}
  ): Promise<string | undefined> {
    const data = await logOperation(
      this.logger,
      operation,
      { provider: 'deepseek', model: this.config.model, ...extraLogData },
      () => this.requestChatCompletion(messages, temperature, errorPrefix)
    );

    return data.choices?.[0]?.message?.content;
  }

  private async requestChatCompletion(
    messages: IPromptMessage[],
    temperature: number,
    errorPrefix: string
  ): Promise<IDeepSeekChatCompletionResponse> {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
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
}
