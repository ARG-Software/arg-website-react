import { getSiteConfig } from '../../../application/ragConfig.js';
import { buildSystemPrompt } from '../../../application/prompts/answering.js';
import {
  buildConversationTransformPrompt,
  buildConversationTransformUserPrompt,
} from '../../../application/prompts/conversationTransform.js';
import {
  buildHistoryMessages,
  buildPageContextMessages,
  buildUserPrompt,
} from '../../../application/prompts/messageFormatting.js';
import { buildIntentFallbackPrompt } from '../../../application/prompts/fallback.js';
import { buildInsufficientContextPrompt } from '../../../application/prompts/insufficientContext.js';
import { buildIntentPrompt } from '../../../application/prompts/intent.js';
import { buildPersonClarificationPrompt } from '../../../application/prompts/personClarification.js';
import { parseIntentResponse, parseRetrievalPlan } from '../../../application/prompts/outputParsers.js';
import { buildRetrievalPlanPrompt } from '../../../application/prompts/retrievalPlan.js';
import type { ChatMessage, PageContext, PromptMessage } from '../../../domain/conversation/ChatMessage.js';
import { getDeepSeekConfig, type DeepSeekConfig } from './deepSeekConfig.js';
import type { RetrievedContext } from '../../../domain/retrieval/RetrievedContext.js';
import type { AnswerProvider } from '../../../application/ports/ProviderPorts.js';
import { createDeepSeekChatCompletion } from './DeepSeekChatClient.js';
import type {
  ConversationTransformTask,
} from '../../../domain/conversation/ConversationTransform.js';
import type {
  FallbackQuestionIntent,
  QuestionIntentResult,
} from '../../../domain/conversation/QuestionIntent.js';
import type {
  RetrievalPlan,
} from '../../../domain/retrieval/RetrievalPlan.js';

type DeepSeekAnswerConfig = DeepSeekConfig & { companyName: string };

export class DeepSeekAnswerClient implements AnswerProvider {
  constructor(private readonly config?: DeepSeekAnswerConfig) {}

  async generateAnswer(
    question: string,
    messages: ChatMessage[],
    contexts: RetrievedContext[],
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const chatMessages: PromptMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(config.companyName, responseLanguage),
      },
      ...buildHistoryMessages(messages),
      {
        role: 'user',
        content: buildUserPrompt(question, contexts),
      },
    ];

    const data = await createDeepSeekChatCompletion({
      config,
      messages: chatMessages,
      temperature: 0.2,
      errorPrefix: 'DeepSeek answer request failed',
    });

    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async planRetrieval(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<RetrievalPlan> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0,
      errorPrefix: 'DeepSeek retrieval-plan request failed',
      messages: [
        { role: 'system', content: buildRetrievalPlanPrompt() },
        ...buildPageContextMessages(pageContext),
        ...buildHistoryMessages(messages),
        { role: 'user', content: question },
      ],
    });

    return parseRetrievalPlan(data.choices?.[0]?.message?.content);
  }

  async classifyQuestionIntent(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<QuestionIntentResult> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0,
      errorPrefix: 'DeepSeek intent classification request failed',
      messages: [
        {
          role: 'system',
          content: buildIntentPrompt(config.companyName),
        },
        ...buildPageContextMessages(pageContext),
        ...buildHistoryMessages(messages),
        {
          role: 'user',
          content: question,
        },
      ],
    });

    return parseIntentResponse(data.choices?.[0]?.message?.content);
  }

  async generateInsufficientContextAnswer(
    question: string,
    messages: ChatMessage[],
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek insufficient context response request failed',
      messages: [
        {
          role: 'system',
          content: buildInsufficientContextPrompt(config.companyName, responseLanguage),
        },
        ...buildHistoryMessages(messages),
        {
          role: 'user',
          content: question,
        },
      ],
    });

    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async generateIntentFallbackResponse(
    question: string,
    intent: FallbackQuestionIntent,
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek intent fallback response request failed',
      messages: [
        {
          role: 'system',
          content: buildIntentFallbackPrompt(config.companyName, intent, responseLanguage),
        },
        {
          role: 'user',
          content: question,
        },
      ],
    });

    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async generatePersonClarification(question: string, responseLanguage: string): Promise<string> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek person clarification response request failed',
      messages: [
        {
          role: 'system',
          content: buildPersonClarificationPrompt(responseLanguage),
        },
        {
          role: 'user',
          content: question,
        },
      ],
    });

    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async rewritePreviousAnswer(
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask,
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createDeepSeekChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek conversation transform request failed',
      messages: [
        {
          role: 'system',
          content: buildConversationTransformPrompt(task, responseLanguage),
        },
        {
          role: 'user',
          content: buildConversationTransformUserPrompt(instruction, previousAnswer),
        },
      ],
    });

    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private getConfig(): DeepSeekAnswerConfig {
    return (
      this.config ?? {
        ...getDeepSeekConfig(),
        ...getSiteConfig(),
      }
    );
  }
}

export const deepSeekAnswerClient = new DeepSeekAnswerClient();
