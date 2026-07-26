import { getDeepSeekConfig, getSiteConfig } from '../config/env.js';
import { buildSystemPrompt } from '../prompts/answering.js';
import {
  buildHistoryMessages,
  buildPageContextMessages,
  buildUserPrompt,
} from '../prompts/contextFormatting.js';
import { buildIntentFallbackPrompt } from '../prompts/fallback.js';
import { buildInsufficientContextPrompt } from '../prompts/insufficientContext.js';
import { buildIntentPrompt } from '../prompts/intent.js';
import { parseIntentResponse, parseRetrievalPlan } from '../prompts/parsers.js';
import { buildRetrievalPlanPrompt } from '../prompts/retrievalPlan.js';
import type { ChatMessage, PageContext, PromptMessage } from '../core/types/chat.js';
import type { RagConfig } from '../core/types/config.js';
import type { RetrievedContext } from '../core/types/context.js';
import type { AnswerProvider } from '../core/types/providers.js';
import type {
  QuestionIntent,
  QuestionIntentResult,
  RetrievalPlan,
} from '../core/types/retrieval.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

type DeepSeekAnswerConfig = Pick<RagConfig, 'deepseekApiKey' | 'deepseekModel' | 'companyName'>;

interface DeepSeekChatCompletionInput {
  config: DeepSeekAnswerConfig;
  messages: PromptMessage[];
  temperature: number;
  errorPrefix: string;
}

interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

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

    const data = await createChatCompletion({
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
    const data = await createChatCompletion({
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
    messages: ChatMessage[]
  ): Promise<QuestionIntentResult> {
    const config = this.getConfig();
    const data = await createChatCompletion({
      config,
      temperature: 0,
      errorPrefix: 'DeepSeek intent classification request failed',
      messages: [
        {
          role: 'system',
          content: buildIntentPrompt(config.companyName),
        },
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
    const data = await createChatCompletion({
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
    intent: Exclude<QuestionIntent, 'rag_question'>,
    responseLanguage: string
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createChatCompletion({
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

async function createChatCompletion({
  config,
  messages,
  temperature,
  errorPrefix,
}: DeepSeekChatCompletionInput): Promise<DeepSeekChatCompletionResponse> {
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
