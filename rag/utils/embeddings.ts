export function toEmbeddingLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
