import { getDeepSeekConfig, getSiteConfig } from '../config/env.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export async function generateAnswer({
  question,
  messages = [],
  contexts,
  config = { ...getDeepSeekConfig(), ...getSiteConfig() },
}) {
  const chatMessages = [
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

export async function rewriteQuestion({
  question,
  messages = [],
  config = { ...getDeepSeekConfig(), ...getSiteConfig() },
}) {
  if (messages.length === 0) {
    return question;
  }

  const data = await createChatCompletion({
    config,
    temperature: 0,
    errorPrefix: 'DeepSeek question rewrite request failed',
    messages: [
      {
        role: 'system',
        content: [
          'Rewrite the latest user question as a standalone search query for retrieval.',
          'Use the conversation only to resolve references such as "it", "that", or "the second one".',
          'Do not answer the question. Return only the rewritten question.',
        ].join(' '),
      },
      ...buildHistoryMessages(messages),
      {
        role: 'user',
        content: question,
      },
    ],
  });

  return data.choices?.[0]?.message?.content?.trim() || question;
}

async function createChatCompletion({ config, messages, temperature, errorPrefix }) {
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

  return response.json();
}

function buildSystemPrompt(companyName) {
  return [
    `You are the public website assistant for ${companyName}.`,
    'Answer only from the provided context.',
    'Use conversation history only to understand references in the latest question.',
    'Do not treat previous assistant messages as facts unless the provided context supports them.',
    'If the context is insufficient, say that you do not have enough information.',
    'Keep answers concise, factual, and useful to prospective clients or candidates.',
  ].join(' ');
}

function buildHistoryMessages(messages) {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
  }));
}

function buildUserPrompt(question, contexts) {
  const contextText = contexts
    .map((context, index) => {
      const citation = context.title || context.url || context.path || `Source ${index + 1}`;
      return `[${index + 1}] ${citation}\n${context.content}`;
    })
    .join('\n\n');

  return `Context:\n${contextText}\n\nQuestion: ${question}`;
}
