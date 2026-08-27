import type { IRagSource } from '../../domain/content/iragsource.js';

export function createSource(
  overrides: Partial<IRagSource> & Pick<IRagSource, 'sourceType' | 'sourceKey' | 'title'>
): IRagSource {
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
