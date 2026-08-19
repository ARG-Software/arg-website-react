import type { RagSource } from '../../domain/content/RagSource.js';

export function createSource(
  overrides: Partial<RagSource> & Pick<RagSource, 'sourceType' | 'sourceKey' | 'title'>
): RagSource {
  if (!overrides.sourceType || !overrides.sourceKey || !overrides.title) {
    throw new Error('RAG sources require sourceType, sourceKey, and title');
  }

  return {
    url: undefined,
    path: undefined,
    origin: 'first_party',
    isPublic: true,
    metadata: {},
    content: '',
    ...overrides,
  };
}
