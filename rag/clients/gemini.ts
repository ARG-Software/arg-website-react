import { getGeminiConfig } from '../config/env.js';
import type { EmbeddingProvider } from '../types/ai.js';
import type { RagConfig } from '../types/config.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 10000;

export class GeminiEmbeddingQuotaError extends Error {
  code = 'embedding_quota_exceeded';

  constructor() {
    super('Gemini embedding quota exceeded');
    this.name = 'GeminiEmbeddingQuotaError';
  }
}

type GeminiEmbeddingConfig = Pick<
  RagConfig,
  'geminiApiKey' | 'geminiEmbeddingModel' | 'geminiEmbeddingDimensions' | 'geminiEmbeddingRequestDelayMs'
>;

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

export class GeminiEmbeddingClient implements EmbeddingProvider {
  constructor(private readonly config?: GeminiEmbeddingConfig) {}

  async embedText(text: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([text]);
    return embedding;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const embeddings = [];
    const config = this.getConfig();

    for (let index = 0; index < texts.length; index += 1) {
      embeddings.push(await this.embedTextContent(texts[index]));

      if (index + 1 < texts.length && config.geminiEmbeddingRequestDelayMs > 0) {
        await sleep(config.geminiEmbeddingRequestDelayMs);
      }
    }

    return embeddings;
  }

  private async embedTextContent(text: string): Promise<number[]> {
    const config = this.getConfig();
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
    return data.embedding?.values ?? [];
  }

  private getConfig(): GeminiEmbeddingConfig {
    return this.config ?? getGeminiConfig();
  }
}

export const geminiEmbeddingClient = new GeminiEmbeddingClient();

async function fetchWithRetry(url: string, init: RequestInit): Promise<GeminiEmbeddingResponse> {
  let lastResponseText = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;

    try {
      response = await fetchWithTimeout(url, init);
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

    if (response.status === 429 && isQuotaExhausted(lastResponseText)) {
      throw new GeminiEmbeddingQuotaError();
    }

    if (response.status !== 429 || attempt === MAX_RETRIES) {
      throw new Error(`Gemini embedding request failed: ${response.status} ${lastResponseText}`);
    }

    await sleep(getRetryDelayMs(lastResponseText, attempt));
  }

  throw new Error(`Gemini embedding request failed: ${lastResponseText}`);
}

function getRetryDelayMs(responseText: string, attempt: number): number {
  const match = responseText.match(/retryDelay"\s*:\s*"(\d+)s"/);
  const retrySeconds = match ? Number(match[1]) : 0;
  return Math.min(5000, Math.max(retrySeconds * 1000, 1000 * 2 ** attempt));
}

function isQuotaExhausted(responseText: string): boolean {
  return /quota exceeded|quotaValue|daily limit/i.test(responseText);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
