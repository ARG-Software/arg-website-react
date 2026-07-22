import { getDeepSeekConfig, getSiteConfig } from '../config/env.js';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

const RAG_INTENT = 'rag_question';

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
  const data = await createChatCompletion({
    config,
    temperature: 0,
    errorPrefix: 'DeepSeek question rewrite request failed',
    messages: [
      {
        role: 'system',
        content: [
          'Rewrite and translate the latest user question as a standalone English search query for retrieval.',
          'Use the conversation only to resolve references such as "it", "that", or "the second one".',
          'Preserve company names, project names, product names, source names, URLs, and other proper nouns.',
          'Do not answer the question. Return only the standalone English retrieval query.',
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

export async function classifyQuestionIntent({
  question,
  messages = [],
  config = { ...getDeepSeekConfig(), ...getSiteConfig() },
}) {
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
    'Answer in the same language as the latest user question.',
    'If the latest user question is not English, answer naturally in that language.',
    'Do not translate company names, project names, URLs, citation titles, or source names.',
    'Answer only from the provided context.',
    'Use conversation history only to understand references in the latest question.',
    'Do not treat previous assistant messages as facts unless the provided context supports them.',
    'If the context is insufficient, say that you do not have enough information.',
    'Keep answers concise, factual, and useful to prospective clients or candidates.',
  ].join(' ');
}

function buildIntentPrompt(companyName) {
  return [
    `You route messages for ${companyName}'s public website assistant.`,
    'Classify the latest user message as one of: small_talk, rag_question, unsupported.',
    'small_talk means greetings, thanks, brief social replies, identity questions, or capability questions.',
    `rag_question means questions about ${companyName}, its services, projects, partners, careers, blog posts, external profiles, contact options, legal pages, or follow-ups about prior ${companyName}-related answers.`,
    `unsupported means unrelated requests, general coding help, personal advice, news, politics, or tasks not about ${companyName}.`,
    'For small_talk and unsupported, include a short response in the same language as the latest user message.',
    `For unsupported, politely redirect to ${companyName} website topics.`,
    'For rag_question, use an empty response string.',
    'Return only valid JSON with this exact shape: {"intent":"small_talk|rag_question|unsupported","response":"..."}.',
  ].join(' ');
}

function parseIntentResponse(content) {
  if (!content) {
    return { intent: RAG_INTENT, response: '' };
  }

  try {
    const parsed = JSON.parse(content);

    if (!['small_talk', RAG_INTENT, 'unsupported'].includes(parsed.intent)) {
      return { intent: RAG_INTENT, response: '' };
    }

    return {
      intent: parsed.intent,
      response: typeof parsed.response === 'string' ? parsed.response.trim() : '',
    };
  } catch {
    return { intent: RAG_INTENT, response: '' };
  }
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
