import {
  getGeminiConfig,
  getGeminiFallbackEmbeddingConfig,
  type GeminiEmbeddingConfig,
} from './geminiConfig.js';
import type { EmbeddingProvider } from '../../../application/ports/ProviderPorts.js';
import {
  EmbeddingQuotaExceededError,
  isEmbeddingQuotaExceededError,
} from '../../../application/ports/ProviderErrors.js';
import { sleep } from '../../../application/common/time.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_BATCH_SIZE = 100;

export { EmbeddingQuotaExceededError, isEmbeddingQuotaExceededError };

type GeminiEmbeddingConfigSource = () => GeminiEmbeddingConfig;

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings?: Array<GeminiEmbeddingResponse['embedding']>;
}

export class GeminiEmbeddingClient implements EmbeddingProvider {
  constructor(private readonly configSource: GeminiEmbeddingConfigSource = getPrimaryEmbeddingConfig) {}

  async embedText(text: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([text]);
    return embedding;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    if (texts.length === 1) {
      return [await this.embedTextContent(texts[0])];
    }

    const embeddings: number[][] = [];
    const config = this.getConfig();

    for (let index = 0; index < texts.length; index += MAX_BATCH_SIZE) {
      const batch = texts.slice(index, index + MAX_BATCH_SIZE);
      embeddings.push(...(await this.embedBatch(batch)));

      if (index + MAX_BATCH_SIZE < texts.length && config.requestDelayMs > 0) {
        await sleep(config.requestDelayMs);
      }
    }

    return embeddings;
  }

  private async embedTextContent(text: string): Promise<number[]> {
    const config = this.getConfig();
    const url = `${GEMINI_API_BASE}/models/${config.model}:embedContent?key=${config.apiKey}`;
    const data = await fetchWithRetry<GeminiEmbeddingResponse>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${config.model}`,
          outputDimensionality: config.dimensions,
          content: {
            parts: [{ text }],
          },
        }),
      },
      config.model
    );
    return data.embedding?.values ?? [];
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const config = this.getConfig();
    const url = `${GEMINI_API_BASE}/models/${config.model}:batchEmbedContents?key=${config.apiKey}`;
    const data = await fetchWithRetry<GeminiBatchEmbeddingResponse>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: texts.map(text => ({
            model: `models/${config.model}`,
            outputDimensionality: config.dimensions,
            content: {
              parts: [{ text }],
            },
          })),
        }),
      },
      config.model
    );
    const embeddings = data.embeddings?.map(embedding => embedding?.values ?? []) ?? [];

    if (embeddings.length !== texts.length) {
      throw new Error(`Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`);
    }

    return embeddings;
  }

  private getConfig(): GeminiEmbeddingConfig {
    return this.configSource();
  }
}

export const geminiEmbeddingClient = new GeminiEmbeddingClient();
export const geminiFallbackEmbeddingClient = new GeminiEmbeddingClient(getFallbackEmbeddingConfig);

function getPrimaryEmbeddingConfig(): GeminiEmbeddingConfig {
  return getGeminiConfig();
}

function getFallbackEmbeddingConfig(): GeminiEmbeddingConfig {
  return getGeminiFallbackEmbeddingConfig();
}

async function fetchWithRetry<T extends GeminiEmbeddingResponse | GeminiBatchEmbeddingResponse>(
  url: string,
  init: RequestInit,
  model: string
): Promise<T> {
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
      return JSON.parse(lastResponseText) as T;
    }

    if (response.status === 429 && isQuotaExhausted(lastResponseText)) {
      throw new EmbeddingQuotaExceededError('Gemini', model);
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
  return /quota|resource exhausted|rate limit|too many requests/i.test(responseText);
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
