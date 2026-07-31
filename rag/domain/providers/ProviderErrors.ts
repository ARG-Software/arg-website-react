export class EmbeddingQuotaExceededError extends Error {
  code = 'embedding_quota_exceeded';

  constructor(provider?: string, model?: string) {
    const providerLabel = provider ? `${provider} ` : '';
    const modelLabel = model ? ` for ${model}` : '';
    super(`${providerLabel}embedding quota exceeded${modelLabel}`);
    this.name = 'EmbeddingQuotaExceededError';
  }
}

export function isEmbeddingQuotaExceededError(
  error: unknown
): error is EmbeddingQuotaExceededError {
  return (
    error instanceof EmbeddingQuotaExceededError ||
    (error instanceof Error &&
      'code' in error &&
      error.code === 'embedding_quota_exceeded')
  );
}
