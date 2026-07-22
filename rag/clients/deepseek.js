import { getDeepSeekConfig, getSiteConfig } from '../config/env.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export async function generateAnswer({
  question,
  contexts,
  config = { ...getDeepSeekConfig(), ...getSiteConfig() },
}) {
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(config.companyName),
        },
        {
          role: 'user',
          content: buildUserPrompt(question, contexts),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek answer request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function buildSystemPrompt(companyName) {
  return [
    `You are the public website assistant for ${companyName}.`,
    'Answer only from the provided context.',
    'If the context is insufficient, say that you do not have enough information.',
    'Keep answers concise, factual, and useful to prospective clients or candidates.',
  ].join(' ');
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
