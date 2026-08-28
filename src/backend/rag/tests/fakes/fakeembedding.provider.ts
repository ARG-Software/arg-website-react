import type { IEmbeddingProvider } from '../../application/ports/iproviderports.js';

export function createFakeEmbeddingProvider(
  embedTexts: (texts: string[]) => number[][] | Promise<number[][]>
): IEmbeddingProvider {
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
