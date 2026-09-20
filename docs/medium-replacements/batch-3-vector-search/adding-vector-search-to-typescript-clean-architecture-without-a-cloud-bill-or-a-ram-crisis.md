# Adding Vector Search to TypeScript Clean Architecture with a TurboVec Sidecar

Use this replacement for the article opening and architecture framing:

```markdown
The previous article, [TurboQuant, TurboVec, and the Real RAM Math for Local Vector Search](https://arg.software/blog/the-ai-big-lie-you-dont-need-32-gb-of-ram-for-vector-search-anymore/), covered the important correction: TurboVec can reduce raw vector payloads dramatically, but the result depends on dimensions, bit width, metadata, and benchmarked recall. It is not a blanket guarantee that every production RAG system suddenly fits on a laptop.

[TurboVec](https://github.com/RyanCodrai/turbovec) ships Rust and Python APIs. It does not ship a Node.js package today. That does not make it unusable from a TypeScript backend. It means the clean boundary is a small internal service.
```

Replace the sidecar API claims with the corrected API names:

```markdown
The verified TurboVec Python API uses `IdMapIndex` for stable external IDs. The example below is intentionally small, but it includes the important corrections missing from the old version: real class names, `float32` conversion, a health endpoint, per-tenant locks, filtering, and explicit persistence hooks.
```

Replace the TypeScript contract section with:

```typescript
// application/ports/VectorSearchPort.ts
export interface VectorSearchFilter {
  tenantId: string;
  documentType?: 'pdf' | 'wiki' | 'email';
}

export interface VectorSearchResult {
  documentId: string;
  score: number;
}

export interface VectorSearchPort {
  indexDocument(input: {
    tenantId: string;
    vectorId: number;
    documentId: string;
    documentType: string;
    embedding: number[];
  }): Promise<void>;

  search(
    embedding: number[],
    limit: number,
    filter: VectorSearchFilter
  ): Promise<VectorSearchResult[]>;
}
```

Replace the deployment caveats with:

```markdown
This article covers the vector-search boundary only. A complete RAG system still needs chunking, stable numeric IDs, source document metadata, access control, embedding model versioning, re-index plans, answer-quality evaluation, citation handling, and observability.

It also does not remove the need to benchmark. TurboVec's public benchmarks are promising, especially at high dimensions, but you still need your own acceptance threshold for recall, latency, memory, persistence, and restore time.
```
