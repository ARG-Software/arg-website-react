import { getGeminiConfig } from '../config/env.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function embedText(text, config = getGeminiConfig()) {
  const [embedding] = await embedTexts([text], config);
  return embedding;
}

export async function embedTexts(texts, config = getGeminiConfig()) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const url = `${GEMINI_API_BASE}/models/${config.geminiEmbeddingModel}:batchEmbedContents?key=${config.geminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: `models/${config.geminiEmbeddingModel}`,
        content: {
          parts: [{ text }],
        },
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini embedding request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return (data.embeddings ?? []).map(embedding => embedding.values);
}
