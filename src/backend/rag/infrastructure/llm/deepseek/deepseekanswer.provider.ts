import { buildSystemPrompt } from '../../../application/prompts/answering.js';
import {
  buildConversationTransformPrompt,
  buildConversationTransformUserPrompt,
} from '../../../application/prompts/conversationtransform.js';
import {
  buildHistoryMessages,
  buildPageContextMessages,
  buildUserPrompt,
} from '../../../application/prompts/messageformatting.js';
import { buildIntentFallbackPrompt } from '../../../application/prompts/fallback.js';
import { buildInsufficientContextPrompt } from '../../../application/prompts/insufficientcontext.js';
import { buildIntentPrompt } from '../../../application/prompts/intent.js';
import { buildPersonClarificationPrompt } from '../../../application/prompts/personclarification.js';
import { parseIntentResponse, parseRetrievalPlan } from '../../../application/prompts/outputparsers.js';
import { buildRetrievalPlanPrompt } from '../../../application/prompts/retrievalplan.js';
import type { IChatMessage, IPageContext, IPromptMessage } from '../../../domain/conversation/ichatmessage.js';
import type { IRetrievedContext } from '../../../domain/retrieval/iretrievedcontext.js';
import type { IAnswerProvider } from '../../../application/ports/iproviderports.js';
import { createDeepSeekChatCompletion } from './deepseekchat.client.js';
import type {
  ConversationTransformTask,
} from '../../../domain/conversation/conversationtransform.js';
import type {
  FallbackQuestionIntent,
  IQuestionIntentResult,
} from '../../../domain/conversation/questionintent.js';
import type {
  IRetrievalPlan,
} from '../../../domain/retrieval/iretrievalplan.js';

type DeepSeekAnswerConfig = {
  apiKey: string;
  model: string;
  companyName: string;
};

export class DeepSeekAnswerClient implements IAnswerProvider {
  constructor(private readonly config: DeepSeekAnswerConfig) {}

  async generateAnswer(
    question: string,
    messages: IChatMessage[],
    contexts: IRetrievedContext[],
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const chatMessages: IPromptMessage[] = [
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
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IRetrievalPlan> {
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
    messages: IChatMessage[],
    pageContext: IPageContext | null
  ): Promise<IQuestionIntentResult> {
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
    messages: IChatMessage[],
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
    return this.config;
  }
}
