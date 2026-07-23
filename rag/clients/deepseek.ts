import { getDeepSeekConfig, getSiteConfig } from '../config/env.js';
import {
  buildHistoryMessages,
  buildInsufficientContextPrompt,
  buildIntentFallbackPrompt,
  buildIntentPrompt,
  buildPageContextMessages,
  buildQuestionRewritePrompt,
  buildSystemPrompt,
  buildUserPrompt,
  parseIntentResponse,
} from '../prompts/answering.js';
import type {
  AnswerProvider,
  ChatMessage,
  PageContext,
  PromptMessage,
  QuestionIntent,
  QuestionIntentResult,
  RetrievedContext,
} from '../types/ai.js';
import type { RagConfig } from '../types/config.js';

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
    contexts: RetrievedContext[]
  ): Promise<string> {
    const config = this.getConfig();
    const chatMessages: PromptMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(config.companyName),
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

  async rewriteQuestion(
    question: string,
    messages: ChatMessage[],
    pageContext: PageContext | null
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createChatCompletion({
      config,
      temperature: 0,
      errorPrefix: 'DeepSeek question rewrite request failed',
      messages: [
        {
          role: 'system',
          content: buildQuestionRewritePrompt(),
        },
        ...buildPageContextMessages(pageContext),
        ...buildHistoryMessages(messages),
        {
          role: 'user',
          content: question,
        },
      ],
    });

    return data.choices?.[0]?.message?.content?.trim() || question;
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
    messages: ChatMessage[]
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek insufficient context response request failed',
      messages: [
        {
          role: 'system',
          content: buildInsufficientContextPrompt(config.companyName),
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
    intent: Exclude<QuestionIntent, 'rag_question'>
  ): Promise<string> {
    const config = this.getConfig();
    const data = await createChatCompletion({
      config,
      temperature: 0.2,
      errorPrefix: 'DeepSeek intent fallback response request failed',
      messages: [
        {
          role: 'system',
          content: buildIntentFallbackPrompt(config.companyName, intent),
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
    }),
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as DeepSeekChatCompletionResponse;
}
