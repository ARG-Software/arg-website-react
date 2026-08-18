import type { EmbeddingProvider } from '../../application/ports/ProviderPorts.js';

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
