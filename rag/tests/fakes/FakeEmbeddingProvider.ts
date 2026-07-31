import type { EmbeddingProvider } from '../../domain/providers/ProviderPorts.js';

export function createFakeEmbeddingProvider(
  embedTexts: (texts: string[]) => number[][] | Promise<number[][]>
): EmbeddingProvider {
  return {
    async embedText(text) {
      const [embedding] = await embedTexts([text]);
      return embedding;
    },
    async embedTexts(texts) {
      return embedTexts(texts);
    },
  };
}
