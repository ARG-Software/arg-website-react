import { getGeminiConfig } from '../config/env.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 6;

export async function embedText(text, config = getGeminiConfig()) {
  const [embedding] = await embedTexts([text], config);
  return embedding;
}

export async function embedTexts(texts, config = getGeminiConfig()) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  return Promise.all(texts.map(text => embedTextContent(text, config)));
}

async function embedTextContent(text, config) {
  const url = `${GEMINI_API_BASE}/models/${config.geminiEmbeddingModel}:embedContent?key=${config.geminiApiKey}`;
  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: `models/${config.geminiEmbeddingModel}`,
      outputDimensionality: config.geminiEmbeddingDimensions,
      content: {
        parts: [{ text }],
      },
    }),
  });
  return data.embedding?.values;
}

export async function embedTextsInBatches(texts, options = {}) {
  const batchSize = options.batchSize ?? 1;
  const config = options.config ?? getGeminiConfig();
  const requestDelayMs = options.requestDelayMs ?? config.geminiEmbeddingRequestDelayMs;
  const embeddings = [];

  if (batchSize < 1) {
    throw new Error('Gemini embedding batch size must be at least 1');
  }

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    embeddings.push(...(await embedTexts(batch, config)));

    if (index + batchSize < texts.length && requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  return embeddings;
}

async function fetchWithRetry(url, init) {
  let lastResponseText = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;

    try {
      response = await fetch(url, init);
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(Math.min(30000, 5000 * 2 ** attempt));
      continue;
    }

    lastResponseText = await response.text();

    if (response.ok) {
      return JSON.parse(lastResponseText);
    }

    if (response.status !== 429 || attempt === MAX_RETRIES) {
      throw new Error(`Gemini embedding request failed: ${response.status} ${lastResponseText}`);
    }

    await sleep(getRetryDelayMs(lastResponseText, attempt));
  }

  throw new Error(`Gemini embedding request failed: ${lastResponseText}`);
}

function getRetryDelayMs(responseText, attempt) {
  const match = responseText.match(/retryDelay"\s*:\s*"(\d+)s"/);
  const retrySeconds = match ? Number(match[1]) : 0;
  return Math.max(retrySeconds * 1000, Math.min(30000, 5000 * 2 ** attempt));
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
